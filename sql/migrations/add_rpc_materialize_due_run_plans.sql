-- =====================================================
-- Migration: Add RPC to materialize due done-future run plans
-- =====================================================
-- Creates RPC function to convert done-future plans into actual runs
-- when their planned_at date has passed

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS public.materialize_my_due_done_future_run_plans();

-- Create RPC function
CREATE OR REPLACE FUNCTION public.materialize_my_due_done_future_run_plans()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_count integer := 0;
BEGIN
  -- Use CTE with FOR UPDATE SKIP LOCKED to avoid race conditions
  WITH due_plans AS (
    SELECT
      id,
      user_id,
      place_id,
      planned_at,
      distance_km,
      target_duration_min
    FROM public.user_run_plans
    WHERE user_id = auth.uid()
      AND status = 'done'
      AND completed_run_id IS NULL
      AND planned_at <= now()
    FOR UPDATE SKIP LOCKED
  ),
  inserted_runs AS (
    INSERT INTO public.user_runs (
      user_id,
      place_id,
      distance_km,
      duration_min,
      pace_sec_per_km,
      ran_at
    )
    SELECT
      user_id,
      place_id,
      distance_km,
      target_duration_min,
      CASE
        WHEN target_duration_min IS NOT NULL AND distance_km > 0
        THEN round((target_duration_min::numeric * 60) / distance_km)
        ELSE NULL
      END,
      planned_at
    FROM due_plans
    RETURNING id, place_id, distance_km, ran_at
  ),
  updated_plans AS (
    UPDATE public.user_run_plans p
    SET completed_run_id = r.id
    FROM inserted_runs r
    WHERE p.user_id = auth.uid()
      AND p.status = 'done'
      AND p.completed_run_id IS NULL
      AND p.place_id = r.place_id
      AND p.distance_km = r.distance_km
      AND p.planned_at = r.ran_at
    RETURNING p.id
  )
  SELECT COUNT(*)::integer INTO created_count FROM updated_plans;

  RETURN created_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.materialize_my_due_done_future_run_plans() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.materialize_my_due_done_future_run_plans IS
  'Materializes done-future run plans into actual user_runs when their planned_at date has passed. Called automatically when user visits /me or place pages. Returns count of created runs.';
