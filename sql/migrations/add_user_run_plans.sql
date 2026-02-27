-- =====================================================
-- Migration: Add user_run_plans table for planned/upcoming runs
-- =====================================================
-- Creates table for users to plan future runs
-- Separate from user_runs (which only stores completed runs)

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop table if exists (for idempotency in development)
DROP TABLE IF EXISTS public.user_run_plans CASCADE;

-- Create user_run_plans table
CREATE TABLE public.user_run_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  planned_at timestamptz NOT NULL,
  distance_km numeric NOT NULL,
  target_duration_min integer NULL,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT user_run_plans_distance_check CHECK (distance_km > 0 AND distance_km <= 100),
  CONSTRAINT user_run_plans_duration_check CHECK (
    target_duration_min IS NULL OR
    (target_duration_min >= 1 AND target_duration_min <= 1000)
  ),
  CONSTRAINT user_run_plans_status_check CHECK (status IN ('planned', 'done', 'skipped'))
);

-- Indexes for performance
CREATE INDEX idx_user_run_plans_user_planned
  ON public.user_run_plans(user_id, planned_at DESC);

CREATE INDEX idx_user_run_plans_place_planned
  ON public.user_run_plans(place_id, planned_at DESC);

-- Partial index for active plans (status = 'planned')
CREATE INDEX idx_user_run_plans_active_plans
  ON public.user_run_plans(user_id, planned_at)
  WHERE status = 'planned';

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_run_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.user_run_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own planned runs
CREATE POLICY "Users can view their own planned runs"
  ON public.user_run_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own planned runs"
  ON public.user_run_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planned runs"
  ON public.user_run_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planned runs"
  ON public.user_run_plans
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.user_run_plans IS
  'Stores planned/upcoming runs for users. Separate from user_runs which only contains completed runs.';
