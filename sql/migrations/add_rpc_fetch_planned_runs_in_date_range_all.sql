-- =====================================================
-- Migration: Add RPC for fetching planned runs with all statuses
-- =====================================================
-- Creates RPC function to fetch user's planned runs by date range
-- Returns all statuses (not just 'planned')

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS public.fetch_my_planned_runs_in_date_range_all(date, date);

-- Create RPC function
CREATE OR REPLACE FUNCTION public.fetch_my_planned_runs_in_date_range_all(
  period_start date,
  period_end date
)
RETURNS SETOF public.user_run_plans
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM public.user_run_plans
  WHERE user_id = auth.uid()
    AND (planned_at::date) BETWEEN period_start AND period_end
  ORDER BY planned_at ASC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.fetch_my_planned_runs_in_date_range_all(date, date) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.fetch_my_planned_runs_in_date_range_all IS
  'Fetch authenticated user''s planned runs within date range (inclusive). Returns all statuses. Uses date casting for timezone-proof filtering.';
