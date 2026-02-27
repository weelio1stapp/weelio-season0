-- =====================================================
-- Migration: User Goals for Run Tracking
-- =====================================================
-- Creates user_goals table for tracking running goals (distance + run count)
-- Initially supports type 'run_distance', designed for future goal types

-- 1) Create user_goals table
CREATE TABLE IF NOT EXISTS public.user_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Projekt Krysa',
  type text NOT NULL DEFAULT 'run_distance',
  period_kind text NOT NULL DEFAULT 'month',
  period_start date NOT NULL,
  period_end date NOT NULL,
  target_distance_km numeric NOT NULL,
  target_runs integer NOT NULL,
  plan_total_runs integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT user_goals_type_check CHECK (type IN ('run_distance')),
  CONSTRAINT user_goals_period_check CHECK (period_end >= period_start),
  CONSTRAINT user_goals_distance_check CHECK (target_distance_km > 0),
  CONSTRAINT user_goals_runs_check CHECK (target_runs > 0),
  CONSTRAINT user_goals_plan_runs_check CHECK (plan_total_runs > 0),

  -- Uniqueness: one active goal per user per type per period_start
  CONSTRAINT user_goals_unique_period UNIQUE (user_id, type, period_start)
);

-- 2) Create indexes
CREATE INDEX IF NOT EXISTS idx_user_goals_user_active
  ON public.user_goals(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_period
  ON public.user_goals(user_id, period_start);

-- 3) Create trigger function for updated_at (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Create trigger for user_goals.updated_at
DROP TRIGGER IF EXISTS update_user_goals_updated_at ON public.user_goals;
CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Enable RLS
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- 6) RLS Policies

-- SELECT: Users can view only their own goals
DROP POLICY IF EXISTS "Users can view own goals" ON public.user_goals;
CREATE POLICY "Users can view own goals"
  ON public.user_goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Users can insert only their own goals
DROP POLICY IF EXISTS "Users can insert own goals" ON public.user_goals;
CREATE POLICY "Users can insert own goals"
  ON public.user_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update only their own goals
DROP POLICY IF EXISTS "Users can update own goals" ON public.user_goals;
CREATE POLICY "Users can update own goals"
  ON public.user_goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete only their own goals
DROP POLICY IF EXISTS "Users can delete own goals" ON public.user_goals;
CREATE POLICY "Users can delete own goals"
  ON public.user_goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7) Comments for documentation
COMMENT ON TABLE public.user_goals IS 'User running goals with distance and run count targets. Supports future goal types via type column.';
COMMENT ON COLUMN public.user_goals.type IS 'Goal type: currently only run_distance, designed for future expansion';
COMMENT ON COLUMN public.user_goals.period_kind IS 'Period granularity (month, week, etc.) - for future use';
COMMENT ON COLUMN public.user_goals.target_distance_km IS 'Target total distance in kilometers for the period';
COMMENT ON COLUMN public.user_goals.target_runs IS 'Target number of runs for the period';
COMMENT ON COLUMN public.user_goals.plan_total_runs IS 'Planned total runs (e.g., 6/week * 4 weeks = 24) for % plan completion';
