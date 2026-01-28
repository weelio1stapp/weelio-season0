-- =====================================================
-- Digital Riddles / Kešky for Weelio Places
-- Anti-cheat system without GPS
-- =====================================================

-- 1) Create place_riddles table
CREATE TABLE IF NOT EXISTS public.place_riddles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id),
  prompt text NOT NULL,
  answer_type text NOT NULL CHECK (answer_type IN ('text', 'number')),
  answer_hash text NOT NULL,
  salt text NOT NULL,
  xp_reward integer NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_place_riddles_place_id ON public.place_riddles(place_id);
CREATE INDEX IF NOT EXISTS idx_place_riddles_author ON public.place_riddles(author_user_id);

-- 2) Create riddle_solves table
CREATE TABLE IF NOT EXISTS public.riddle_solves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  riddle_id uuid NOT NULL REFERENCES public.place_riddles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  solved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(riddle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_riddle_solves_user ON public.riddle_solves(user_id);
CREATE INDEX IF NOT EXISTS idx_riddle_solves_riddle ON public.riddle_solves(riddle_id);

-- 3) Create riddle_attempts table (rate limiting)
CREATE TABLE IF NOT EXISTS public.riddle_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  riddle_id uuid NOT NULL REFERENCES public.place_riddles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  attempted_on date NOT NULL DEFAULT current_date,
  attempts integer NOT NULL DEFAULT 0,
  UNIQUE(riddle_id, user_id, attempted_on)
);

CREATE INDEX IF NOT EXISTS idx_riddle_attempts_user_date ON public.riddle_attempts(user_id, attempted_on);

-- =====================================================
-- RLS Policies
-- =====================================================

-- place_riddles
ALTER TABLE public.place_riddles ENABLE ROW LEVEL SECURITY;

-- Public can read active riddles (but we'll exclude answer_hash/salt in queries)
DROP POLICY IF EXISTS "Public can read active riddles" ON public.place_riddles;
CREATE POLICY "Public can read active riddles"
  ON public.place_riddles
  FOR SELECT
  TO public
  USING (is_active = true);

-- Only author can insert/update/delete their riddles
DROP POLICY IF EXISTS "Author can manage own riddles" ON public.place_riddles;
CREATE POLICY "Author can manage own riddles"
  ON public.place_riddles
  FOR ALL
  TO authenticated
  USING (auth.uid() = author_user_id)
  WITH CHECK (auth.uid() = author_user_id);

-- riddle_solves
ALTER TABLE public.riddle_solves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own solves" ON public.riddle_solves;
CREATE POLICY "Users can view own solves"
  ON public.riddle_solves
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own solves" ON public.riddle_solves;
CREATE POLICY "Users can insert own solves"
  ON public.riddle_solves
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- riddle_attempts
ALTER TABLE public.riddle_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own attempts" ON public.riddle_attempts;
CREATE POLICY "Users can manage own attempts"
  ON public.riddle_attempts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RPC Functions
-- =====================================================

-- 1) Create place riddle
CREATE OR REPLACE FUNCTION public.create_place_riddle(
  p_place_id uuid,
  p_prompt text,
  p_answer_type text,
  p_answer_plain text,
  p_xp_reward integer DEFAULT 15
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_salt text;
  v_normalized_answer text;
  v_answer_hash text;
  v_riddle_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate answer_type
  IF p_answer_type NOT IN ('text', 'number') THEN
    RAISE EXCEPTION 'Invalid answer_type. Must be text or number.';
  END IF;

  -- Generate random salt
  v_salt := encode(gen_random_bytes(16), 'hex');

  -- Normalize answer
  IF p_answer_type = 'text' THEN
    v_normalized_answer := lower(trim(p_answer_plain));
  ELSE
    v_normalized_answer := trim(p_answer_plain);
  END IF;

  -- Compute hash: sha256(normalized_answer:salt)
  v_answer_hash := encode(
    digest(v_normalized_answer || ':' || v_salt, 'sha256'),
    'hex'
  );

  -- Insert riddle
  INSERT INTO public.place_riddles (
    place_id,
    author_user_id,
    prompt,
    answer_type,
    answer_hash,
    salt,
    xp_reward,
    is_active
  )
  VALUES (
    p_place_id,
    v_user_id,
    p_prompt,
    p_answer_type,
    v_answer_hash,
    v_salt,
    p_xp_reward,
    true
  )
  RETURNING id INTO v_riddle_id;

  RETURN v_riddle_id;
END;
$$;

-- 2) Attempt riddle
CREATE OR REPLACE FUNCTION public.attempt_riddle(
  p_riddle_id uuid,
  p_answer_plain text
)
RETURNS TABLE(
  ok boolean,
  correct boolean,
  already_solved boolean,
  xp_delta integer,
  attempts_left integer,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_riddle record;
  v_normalized_answer text;
  v_computed_hash text;
  v_already_solved boolean;
  v_today date;
  v_current_attempts integer;
  v_max_attempts integer := 5;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, false, false, 0, 0, 'Not authenticated'::text;
    RETURN;
  END IF;

  -- Get riddle details
  SELECT * INTO v_riddle
  FROM public.place_riddles
  WHERE id = p_riddle_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, false, 0, 0, 'Riddle not found or inactive'::text;
    RETURN;
  END IF;

  -- Check if already solved
  SELECT EXISTS(
    SELECT 1 FROM public.riddle_solves
    WHERE riddle_id = p_riddle_id AND user_id = v_user_id
  ) INTO v_already_solved;

  IF v_already_solved THEN
    RETURN QUERY SELECT true, true, true, 0, 0, NULL::text;
    RETURN;
  END IF;

  -- Check daily attempts
  v_today := current_date;

  SELECT COALESCE(attempts, 0) INTO v_current_attempts
  FROM public.riddle_attempts
  WHERE riddle_id = p_riddle_id
    AND user_id = v_user_id
    AND attempted_on = v_today;

  IF v_current_attempts >= v_max_attempts THEN
    RETURN QUERY SELECT true, false, false, 0, 0, 'Max attempts reached for today'::text;
    RETURN;
  END IF;

  -- Normalize answer
  IF v_riddle.answer_type = 'text' THEN
    v_normalized_answer := lower(trim(p_answer_plain));
  ELSE
    v_normalized_answer := trim(p_answer_plain);
  END IF;

  -- Compute hash
  v_computed_hash := encode(
    digest(v_normalized_answer || ':' || v_riddle.salt, 'sha256'),
    'hex'
  );

  -- Check if correct
  IF v_computed_hash = v_riddle.answer_hash THEN
    -- Correct answer!

    -- Insert solve record
    INSERT INTO public.riddle_solves (riddle_id, user_id)
    VALUES (p_riddle_id, v_user_id)
    ON CONFLICT (riddle_id, user_id) DO NOTHING;

    -- Add XP to user_progress
    -- Ensure user_progress exists
    INSERT INTO public.user_progress (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Update XP
    UPDATE public.user_progress
    SET xp = xp + v_riddle.xp_reward,
        updated_at = now()
    WHERE user_id = v_user_id;

    RETURN QUERY SELECT true, true, false, v_riddle.xp_reward, 0, NULL::text;
    RETURN;
  ELSE
    -- Incorrect answer

    -- Increment attempts
    INSERT INTO public.riddle_attempts (riddle_id, user_id, attempted_on, attempts)
    VALUES (p_riddle_id, v_user_id, v_today, 1)
    ON CONFLICT (riddle_id, user_id, attempted_on)
    DO UPDATE SET attempts = riddle_attempts.attempts + 1;

    v_current_attempts := v_current_attempts + 1;

    RETURN QUERY SELECT
      true,
      false,
      false,
      0,
      GREATEST(0, v_max_attempts - v_current_attempts),
      NULL::text;
    RETURN;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_place_riddle(uuid, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attempt_riddle(uuid, text) TO authenticated;

-- =====================================================
-- Manual steps required:
-- 1. Copy and paste this entire SQL into Supabase SQL Editor
-- 2. Execute the script
-- 3. Verify tables and policies are created
-- =====================================================
