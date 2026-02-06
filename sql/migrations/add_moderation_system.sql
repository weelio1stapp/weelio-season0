-- =====================================================
-- Moderation System v1: Reports + Hide/Delete
-- =====================================================

-- 1) Create moderation_reports table
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('place_photo', 'place_media', 'journal_entry', 'riddle')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) >= 5),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  action_taken text CHECK (action_taken IN ('hide', 'delete', 'dismiss')),

  -- Prevent duplicate reports from same user for same target
  CONSTRAINT unique_user_target UNIQUE (reporter_user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON public.moderation_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter ON public.moderation_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_target ON public.moderation_reports(target_type, target_id);

-- 2) Add is_hidden columns to target tables

-- place_photos
ALTER TABLE public.place_photos
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_place_photos_not_hidden
  ON public.place_photos(place_id, created_at DESC)
  WHERE is_hidden = false;

-- place_media
ALTER TABLE public.place_media
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_place_media_not_hidden
  ON public.place_media(place_id, created_at)
  WHERE is_hidden = false;

-- journal_entries
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_journal_entries_not_hidden
  ON public.journal_entries(user_id, created_at DESC)
  WHERE is_hidden = false;

-- place_riddles
ALTER TABLE public.place_riddles
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_place_riddles_not_hidden
  ON public.place_riddles(place_id)
  WHERE is_hidden = false AND is_active = true;

-- =====================================================
-- RLS Policies for moderation_reports
-- =====================================================

ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can INSERT their own reports
DROP POLICY IF EXISTS "Users can create reports" ON public.moderation_reports;
CREATE POLICY "Users can create reports"
  ON public.moderation_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_user_id);

-- Users can SELECT their own reports (optional - for "my reports" view)
DROP POLICY IF EXISTS "Users can view own reports" ON public.moderation_reports;
CREATE POLICY "Users can view own reports"
  ON public.moderation_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_user_id);

-- Note: Admin SELECT/UPDATE/DELETE will be handled via SECURITY DEFINER RPC

-- =====================================================
-- Update existing RLS policies to exclude hidden content
-- =====================================================

-- place_photos: Update public read policy
DROP POLICY IF EXISTS "Allow public read access to place photos" ON public.place_photos;
CREATE POLICY "Allow public read access to place photos"
  ON public.place_photos
  FOR SELECT
  USING (is_hidden = false);

-- place_media: Check if read policy exists and update
-- Note: You may need to adjust this based on your existing place_media policies
-- For now, we'll assume similar structure to place_photos

-- place_riddles: Update public read policy
DROP POLICY IF EXISTS "Public can read active riddles" ON public.place_riddles;
CREATE POLICY "Public can read active riddles"
  ON public.place_riddles
  FOR SELECT
  TO public
  USING (is_active = true AND is_hidden = false);

-- journal_entries: Assume existing visibility-based policies need update
-- We'll handle journal filtering in application code since RLS may be complex with visibility

-- =====================================================
-- RPC Functions for Admin Moderation
-- =====================================================

-- 1) Get all reports (admin only - will check allowlist in app code)
CREATE OR REPLACE FUNCTION public.get_moderation_reports(
  p_status_filter text DEFAULT 'all'
)
RETURNS TABLE(
  id uuid,
  reporter_user_id uuid,
  reporter_display_name text,
  target_type text,
  target_id uuid,
  reason text,
  status text,
  created_at timestamptz,
  resolved_by uuid,
  resolved_at timestamptz,
  action_taken text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Note: Admin check will be done in app code before calling this
  -- This function is SECURITY DEFINER so it bypasses RLS

  RETURN QUERY
  SELECT
    mr.id,
    mr.reporter_user_id,
    p.display_name as reporter_display_name,
    mr.target_type,
    mr.target_id,
    mr.reason,
    mr.status,
    mr.created_at,
    mr.resolved_by,
    mr.resolved_at,
    mr.action_taken
  FROM public.moderation_reports mr
  LEFT JOIN public.profiles p ON p.id = mr.reporter_user_id
  WHERE
    CASE
      WHEN p_status_filter = 'open' THEN mr.status = 'open'
      WHEN p_status_filter = 'resolved' THEN mr.status = 'resolved'
      WHEN p_status_filter = 'dismissed' THEN mr.status = 'dismissed'
      ELSE true
    END
  ORDER BY mr.created_at DESC;
END;
$$;

-- 2) Take moderation action (admin only)
CREATE OR REPLACE FUNCTION public.take_moderation_action(
  p_report_id uuid,
  p_action text,
  p_admin_user_id uuid
)
RETURNS TABLE(
  ok boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report record;
  v_table_name text;
BEGIN
  -- Note: Admin check will be done in app code before calling this

  -- Validate action
  IF p_action NOT IN ('hide', 'delete', 'dismiss') THEN
    RETURN QUERY SELECT false, 'Invalid action. Must be hide, delete, or dismiss.'::text;
    RETURN;
  END IF;

  -- Get report
  SELECT * INTO v_report
  FROM public.moderation_reports
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Report not found'::text;
    RETURN;
  END IF;

  IF v_report.status != 'open' THEN
    RETURN QUERY SELECT false, 'Report already processed'::text;
    RETURN;
  END IF;

  -- Determine table name
  CASE v_report.target_type
    WHEN 'place_photo' THEN v_table_name := 'place_photos';
    WHEN 'place_media' THEN v_table_name := 'place_media';
    WHEN 'journal_entry' THEN v_table_name := 'journal_entries';
    WHEN 'riddle' THEN v_table_name := 'place_riddles';
    ELSE
      RETURN QUERY SELECT false, 'Invalid target type'::text;
      RETURN;
  END CASE;

  -- Execute action
  IF p_action = 'hide' THEN
    -- Set is_hidden = true
    EXECUTE format('UPDATE public.%I SET is_hidden = true WHERE id = $1', v_table_name)
    USING v_report.target_id;

    -- Update report
    UPDATE public.moderation_reports
    SET status = 'resolved',
        action_taken = 'hide',
        resolved_by = p_admin_user_id,
        resolved_at = now()
    WHERE id = p_report_id;

  ELSIF p_action = 'delete' THEN
    -- Delete the target entity
    EXECUTE format('DELETE FROM public.%I WHERE id = $1', v_table_name)
    USING v_report.target_id;

    -- Update report
    UPDATE public.moderation_reports
    SET status = 'resolved',
        action_taken = 'delete',
        resolved_by = p_admin_user_id,
        resolved_at = now()
    WHERE id = p_report_id;

  ELSIF p_action = 'dismiss' THEN
    -- Just dismiss the report without touching target
    UPDATE public.moderation_reports
    SET status = 'dismissed',
        action_taken = 'dismiss',
        resolved_by = p_admin_user_id,
        resolved_at = now()
    WHERE id = p_report_id;
  END IF;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_moderation_reports(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.take_moderation_action(uuid, text, uuid) TO authenticated;

-- =====================================================
-- Manual steps required:
-- 1. Copy and paste this entire SQL into Supabase SQL Editor
-- 2. Execute the script
-- 3. Verify tables, columns, and policies are created
-- 4. Test RPC functions
-- =====================================================
