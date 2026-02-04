-- =====================================================
-- Migration: XP Events System (Idempotent XP Awards)
-- =====================================================

-- 1) Create user_xp_events table for tracking XP awards
CREATE TABLE IF NOT EXISTS public.user_xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL, -- e.g., 'riddle', 'visit', 'challenge'
  source_id text NOT NULL, -- e.g., riddle_id or visit_id
  xp_delta integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint to prevent duplicate awards for the same event
  CONSTRAINT unique_xp_event UNIQUE (user_id, source, source_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_xp_events_user_id
ON public.user_xp_events(user_id);

CREATE INDEX IF NOT EXISTS idx_user_xp_events_source
ON public.user_xp_events(source, source_id);

-- 2) RLS Policies for user_xp_events
ALTER TABLE public.user_xp_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own XP events
DROP POLICY IF EXISTS "Users can view own xp events" ON public.user_xp_events;
CREATE POLICY "Users can view own xp events"
  ON public.user_xp_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own XP events (via RPC only in practice)
DROP POLICY IF EXISTS "Users can insert own xp events" ON public.user_xp_events;
CREATE POLICY "Users can insert own xp events"
  ON public.user_xp_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3) RPC: Award XP (Idempotent)
-- This function ensures that the same event_id (source + source_id)
-- is only awarded once per user
CREATE OR REPLACE FUNCTION public.award_xp(
  p_source text,
  p_source_id text,
  p_xp_delta integer
)
RETURNS TABLE(
  awarded boolean,
  xp_delta integer,
  xp_total bigint,
  level integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_xp bigint;
  v_new_xp bigint;
  v_level integer;
  v_awarded boolean;
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

  -- Try to insert XP event (will fail if duplicate due to unique constraint)
  BEGIN
    INSERT INTO public.user_xp_events (user_id, source, source_id, xp_delta)
    VALUES (v_user_id, p_source, p_source_id, p_xp_delta);

    v_awarded := true;
  EXCEPTION
    WHEN unique_violation THEN
      -- Event already awarded, do nothing
      v_awarded := false;
  END;

  -- Only update user_progress if XP was awarded
  IF v_awarded THEN
    UPDATE public.user_progress
    SET
      xp = xp + p_xp_delta,
      updated_at = now()
    WHERE user_id = v_user_id
    RETURNING xp INTO v_new_xp;
  ELSE
    -- Get current XP without updating
    SELECT xp INTO v_new_xp
    FROM public.user_progress
    WHERE user_id = v_user_id;
  END IF;

  -- Calculate level: level = floor(total_xp / 100) + 1
  v_level := FLOOR(v_new_xp / 100.0) + 1;

  -- Return results
  awarded := v_awarded;
  xp_delta := CASE WHEN v_awarded THEN p_xp_delta ELSE 0 END;
  xp_total := v_new_xp;
  level := v_level;

  RETURN NEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.award_xp(text, text, integer) TO authenticated;

-- Comment for documentation
COMMENT ON TABLE public.user_xp_events IS 'Tracks all XP award events per user (idempotent via unique constraint)';
COMMENT ON FUNCTION public.award_xp IS 'Awards XP to current user for a specific event (idempotent - same event_id only awards once)';
