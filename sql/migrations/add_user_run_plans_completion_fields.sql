-- =====================================================
-- Migration: Add completion tracking fields to user_run_plans
-- =====================================================
-- Adds completed_run_id and completed_at to track when a plan
-- was completed and link to the actual user_runs row (if created)

-- Add columns if they don't exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_run_plans'
    AND column_name = 'completed_run_id'
  ) THEN
    ALTER TABLE public.user_run_plans
    ADD COLUMN completed_run_id uuid NULL REFERENCES public.user_runs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_run_plans'
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.user_run_plans
    ADD COLUMN completed_at timestamptz NULL;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.user_run_plans.completed_run_id IS
  'References the user_runs row created when this plan was completed (if applicable)';

COMMENT ON COLUMN public.user_run_plans.completed_at IS
  'Timestamp when the plan was marked as done';
