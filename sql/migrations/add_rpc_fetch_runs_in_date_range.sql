-- =====================================================
-- Migration: Add RPC for timezone-proof run date filtering
-- =====================================================
-- Creates RPC function to fetch user runs by date range
-- Uses ran_at::date for timezone-independent filtering

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS public.fetch_my_runs_in_date_range(date, date);

-- Create RPC function
CREATE OR REPLACE FUNCTION public.fetch_my_runs_in_date_range(
  period_start date,
  period_end date
)
RETURNS SETOF public.user_runs
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM public.user_runs
  WHERE user_id = auth.uid()
    AND (ran_at::date) BETWEEN period_start AND period_end
  ORDER BY ran_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.fetch_my_runs_in_date_range(date, date) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.fetch_my_runs_in_date_range IS
  'Fetch authenticated user''s runs within date range (inclusive). Uses date casting for timezone-proof filtering.';
