-- =====================================================
-- Text Visit v1: Add note field to visits and visit linkage to journal
-- =====================================================

-- 1) Add note column to place_visits if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'place_visits' AND column_name = 'note'
  ) THEN
    ALTER TABLE public.place_visits ADD COLUMN note text;
  END IF;
END $$;

-- 2) Add visit_id column to journal_entries if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'visit_id'
  ) THEN
    ALTER TABLE public.journal_entries
    ADD COLUMN visit_id uuid REFERENCES public.place_visits(id) ON DELETE SET NULL;

    -- Add index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_journal_entries_visit_id
    ON public.journal_entries(visit_id);
  END IF;
END $$;

-- 3) Create or replace RPC for recording visit with note
CREATE OR REPLACE FUNCTION public.record_visit_with_note(
  p_place_id uuid,
  p_note text DEFAULT NULL
)
RETURNS TABLE(
  visit_id uuid,
  journal_entry_id uuid,
  is_duplicate boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_visit_id uuid;
  v_journal_id uuid;
  v_today date;
  v_existing_visit_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_today := CURRENT_DATE;

  -- Check for existing visit today (idempotence)
  SELECT id INTO v_existing_visit_id
  FROM public.place_visits
  WHERE user_id = v_user_id
    AND place_id = p_place_id
    AND DATE(created_at) = v_today
  LIMIT 1;

  IF v_existing_visit_id IS NOT NULL THEN
    -- Visit already exists today - return it
    visit_id := v_existing_visit_id;
    journal_entry_id := NULL;
    is_duplicate := TRUE;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Create new visit
  INSERT INTO public.place_visits (place_id, user_id, source, note)
  VALUES (p_place_id, v_user_id, 'manual', p_note)
  RETURNING id INTO v_visit_id;

  -- Create journal entry if note provided
  IF p_note IS NOT NULL AND p_note != '' THEN
    INSERT INTO public.journal_entries (user_id, place_id, visit_id, content, visibility)
    VALUES (v_user_id, p_place_id, v_visit_id, p_note, 'private')
    RETURNING id INTO v_journal_id;
  END IF;

  -- Return results
  visit_id := v_visit_id;
  journal_entry_id := v_journal_id;
  is_duplicate := FALSE;
  RETURN NEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.record_visit_with_note(uuid, text) TO authenticated;
