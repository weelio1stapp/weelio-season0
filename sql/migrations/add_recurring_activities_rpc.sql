-- =========================================
-- Recurring Activities System (Weelio) - PART 3: RPC FUNCTIONS
-- =========================================

-- 1) Create pending check-in (idempotent)
CREATE OR REPLACE FUNCTION public.create_activity_checkin(p_occurrence_id uuid)
RETURNS TABLE(
  checkin_id uuid,
  status text,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_activity_id uuid;
  v_is_public boolean;
  v_existing_id uuid;
  v_checkin_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT null::uuid, 'error'::text, 'Not authenticated'::text;
    RETURN;
  END IF;

  -- Check if occurrence exists and get activity info
  SELECT o.activity_id, a.is_public
  INTO v_activity_id, v_is_public
  FROM public.activity_occurrences o
  JOIN public.activities a ON a.id = o.activity_id
  WHERE o.id = p_occurrence_id;

  IF v_activity_id IS NULL THEN
    RETURN QUERY SELECT null::uuid, 'error'::text, 'Occurrence not found'::text;
    RETURN;
  END IF;

  -- Only allow check-ins for public activities
  IF NOT v_is_public THEN
    RETURN QUERY SELECT null::uuid, 'error'::text, 'Activity is not public'::text;
    RETURN;
  END IF;

  -- Check for existing check-in (idempotent)
  SELECT id INTO v_existing_id
  FROM public.activity_checkins
  WHERE occurrence_id = p_occurrence_id
    AND user_id = v_user_id;

  IF v_existing_id IS NOT NULL THEN
    -- Already checked in
    RETURN QUERY SELECT v_existing_id, 'existing'::text, 'Already checked in'::text;
    RETURN;
  END IF;

  -- Create new pending check-in
  INSERT INTO public.activity_checkins (
    occurrence_id,
    user_id,
    checkin_method,
    status
  ) VALUES (
    p_occurrence_id,
    v_user_id,
    'manual',
    'pending'
  )
  RETURNING id INTO v_checkin_id;

  RETURN QUERY SELECT v_checkin_id, 'created'::text, 'Check-in created'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_activity_checkin(uuid) TO authenticated;

-- 2) Confirm check-in and award XP
CREATE OR REPLACE FUNCTION public.confirm_activity_checkin(p_checkin_id uuid)
RETURNS TABLE(
  success boolean,
  message text,
  xp_awarded integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_checkin_user_id uuid;
  v_activity_id uuid;
  v_occurrence_id uuid;
  v_current_status text;
  v_is_organizer boolean;
  v_xp_delta integer;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::text, 0;
    RETURN;
  END IF;

  -- Get check-in details
  SELECT
    c.user_id,
    c.occurrence_id,
    c.status,
    o.activity_id
  INTO
    v_checkin_user_id,
    v_occurrence_id,
    v_current_status,
    v_activity_id
  FROM public.activity_checkins c
  JOIN public.activity_occurrences o ON o.id = c.occurrence_id
  WHERE c.id = p_checkin_id;

  IF v_activity_id IS NULL THEN
    RETURN QUERY SELECT false, 'Check-in not found'::text, 0;
    RETURN;
  END IF;

  -- Check if current user is organizer
  v_is_organizer := public.is_activity_organizer(v_activity_id, v_user_id);

  IF NOT v_is_organizer THEN
    RETURN QUERY SELECT false, 'Not authorized (organizer only)'::text, 0;
    RETURN;
  END IF;

  -- Check if already confirmed
  IF v_current_status = 'confirmed' THEN
    RETURN QUERY SELECT false, 'Already confirmed'::text, 0;
    RETURN;
  END IF;

  -- Update check-in to confirmed
  UPDATE public.activity_checkins
  SET
    status = 'confirmed',
    confirmed_by = v_user_id,
    confirmed_at = now()
  WHERE id = p_checkin_id;

  -- Award XP to the check-in user (using existing award_xp function)
  -- Note: award_xp automatically handles idempotency via unique constraint
  DECLARE
    v_xp_result record;
  BEGIN
    SELECT * INTO v_xp_result
    FROM public.award_xp(
      'activity_checkin'::text,
      p_checkin_id::text,
      50  -- 50 XP per confirmed check-in
    );

    v_xp_delta := COALESCE(v_xp_result.xp_delta, 0);
  EXCEPTION WHEN OTHERS THEN
    -- If XP award fails, log but don't fail the confirmation
    RAISE NOTICE 'XP award failed for check-in %: %', p_checkin_id, SQLERRM;
    v_xp_delta := 0;
  END;

  RETURN QUERY SELECT true, 'Check-in confirmed'::text, v_xp_delta;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_activity_checkin(uuid) TO authenticated;

-- 3) Trigger: Auto-add creator as owner when activity is created
CREATE OR REPLACE FUNCTION public.after_activity_insert_add_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert creator as owner (ignore if already exists)
  INSERT INTO public.activity_roles (activity_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (activity_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_after_activity_insert_add_owner ON public.activities;
CREATE TRIGGER trg_after_activity_insert_add_owner
  AFTER INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.after_activity_insert_add_owner();

-- Comments for documentation
COMMENT ON FUNCTION public.create_activity_checkin(uuid) IS 'Creates a pending check-in for an activity occurrence (idempotent per user+occurrence)';
COMMENT ON FUNCTION public.confirm_activity_checkin(uuid) IS 'Confirms a pending check-in (organizer only) and awards XP to the user';
COMMENT ON FUNCTION public.after_activity_insert_add_owner() IS 'Trigger function: Auto-adds activity creator as owner role';
