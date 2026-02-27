-- =====================================================
-- Migration: Add RPC for timezone-proof planned run date filtering
-- =====================================================
-- Creates RPC function to fetch user's planned runs by date range
-- Uses planned_at::date for timezone-independent filtering

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS public.fetch_my_planned_runs_in_date_range(date, date);

-- Create RPC function
CREATE OR REPLACE FUNCTION public.fetch_my_planned_runs_in_date_range(
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
    AND status = 'planned'
    AND (planned_at::date) BETWEEN period_start AND period_end
  ORDER BY planned_at ASC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.fetch_my_planned_runs_in_date_range(date, date) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.fetch_my_planned_runs_in_date_range IS
  'Fetch authenticated user''s planned runs within date range (inclusive). Only returns status=planned. Uses date casting for timezone-proof filtering.';
