-- =====================================================
-- XP and Weekly Streak System for Weelio Season 0
-- =====================================================

-- 1) Create user_progress table
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp bigint NOT NULL DEFAULT 0,
  streak_weeks integer NOT NULL DEFAULT 0,
  best_streak_weeks integer NOT NULL DEFAULT 0,
  last_visit_on date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) RLS Policies for user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for authenticated users (only their own row)
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress"
  ON public.user_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow INSERT for authenticated users (only their own row)
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
CREATE POLICY "Users can insert own progress"
  ON public.user_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow UPDATE for authenticated users (only their own row)
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
CREATE POLICY "Users can update own progress"
  ON public.user_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3) RPC: Ensure user progress row exists
CREATE OR REPLACE FUNCTION public.ensure_user_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_progress (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- 4) RPC: Apply visit XP and update streak
CREATE OR REPLACE FUNCTION public.apply_visit_xp_and_streak(
  p_place_id uuid,
  p_visit_on date
)
RETURNS TABLE(
  xp_delta integer,
  xp_total bigint,
  streak_weeks integer,
  best_streak_weeks integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_xp_delta integer;
  v_is_first_visit boolean;
  v_current_xp bigint;
  v_current_streak integer;
  v_current_best_streak integer;
  v_last_visit_on date;
  v_new_streak integer;
  v_new_best_streak integer;
  v_days_diff integer;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure user_progress row exists
  INSERT INTO public.user_progress (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current progress
  SELECT xp, streak_weeks, best_streak_weeks, last_visit_on
  INTO v_current_xp, v_current_streak, v_current_best_streak, v_last_visit_on
  FROM public.user_progress
  WHERE user_id = v_user_id;

  -- Check if this is the first visit to this place ever
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.place_visits
    WHERE user_id = v_user_id
      AND place_id = p_place_id
      AND visited_on < p_visit_on
  ) INTO v_is_first_visit;

  -- Calculate XP delta
  IF v_is_first_visit THEN
    v_xp_delta := 30; -- 10 base + 20 first visit bonus
  ELSE
    v_xp_delta := 10; -- base XP
  END IF;

  -- Calculate new streak
  IF v_last_visit_on IS NULL THEN
    -- First visit ever
    v_new_streak := 1;
  ELSIF p_visit_on = v_last_visit_on THEN
    -- Same day - no change to streak
    v_new_streak := v_current_streak;
  ELSIF p_visit_on > v_last_visit_on THEN
    -- Calculate days difference
    v_days_diff := p_visit_on - v_last_visit_on;

    IF v_days_diff <= 7 THEN
      -- Within 7 days - increment streak
      v_new_streak := v_current_streak + 1;
    ELSE
      -- More than 7 days - reset to 1
      v_new_streak := 1;
    END IF;
  ELSE
    -- Visit in the past (shouldn't happen, but handle it)
    v_new_streak := v_current_streak;
  END IF;

  -- Update best streak
  v_new_best_streak := GREATEST(v_current_best_streak, v_new_streak);

  -- Update user_progress
  UPDATE public.user_progress
  SET
    xp = xp + v_xp_delta,
    streak_weeks = v_new_streak,
    best_streak_weeks = v_new_best_streak,
    last_visit_on = CASE
      WHEN p_visit_on > COALESCE(last_visit_on, '1900-01-01'::date)
      THEN p_visit_on
      ELSE last_visit_on
    END,
    updated_at = now()
  WHERE user_id = v_user_id;

  -- Return results
  xp_delta := v_xp_delta;
  xp_total := v_current_xp + v_xp_delta;
  streak_weeks := v_new_streak;
  best_streak_weeks := v_new_best_streak;

  RETURN NEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_visit_xp_and_streak(uuid, date) TO authenticated;
