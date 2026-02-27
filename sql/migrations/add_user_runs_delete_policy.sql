-- =====================================================
-- Migration: Add DELETE policy for user_runs
-- =====================================================
-- Allows users to delete their own runs

-- Drop policy if exists (for idempotency)
DROP POLICY IF EXISTS "Users can delete their own runs" ON public.user_runs;

-- Create DELETE policy
CREATE POLICY "Users can delete their own runs"
  ON public.user_runs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON POLICY "Users can delete their own runs" ON public.user_runs IS
  'Allows authenticated users to delete only their own run records';
