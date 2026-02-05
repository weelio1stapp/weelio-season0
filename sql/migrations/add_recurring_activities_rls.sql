-- =========================================
-- Recurring Activities System (Weelio) - PART 2: RLS POLICIES
-- =========================================

-- 1) Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_checkins ENABLE ROW LEVEL SECURITY;

-- 2) Helper function: is_activity_organizer
CREATE OR REPLACE FUNCTION public.is_activity_organizer(p_activity_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.activity_roles r
    WHERE r.activity_id = p_activity_id
      AND r.user_id = p_user_id
      AND r.role IN ('owner','organizer')
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_activity_organizer(uuid, uuid) TO authenticated;

-- =========================================
-- 3) RLS POLICIES - ACTIVITIES
-- =========================================

-- Public read if is_public, otherwise only members (roles) or creator
DROP POLICY IF EXISTS "activities_select_public_or_member" ON public.activities;
CREATE POLICY "activities_select_public_or_member"
  ON public.activities
  FOR SELECT
  USING (
    is_public = true
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.activity_roles r
      WHERE r.activity_id = activities.id AND r.user_id = auth.uid()
    )
  );

-- Authenticated users can create activities
DROP POLICY IF EXISTS "activities_insert_auth" ON public.activities;
CREATE POLICY "activities_insert_auth"
  ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Only owners can update activities
DROP POLICY IF EXISTS "activities_update_owner" ON public.activities;
CREATE POLICY "activities_update_owner"
  ON public.activities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_roles r
      WHERE r.activity_id = activities.id
        AND r.user_id = auth.uid()
        AND r.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activity_roles r
      WHERE r.activity_id = activities.id
        AND r.user_id = auth.uid()
        AND r.role = 'owner'
    )
  );

-- Only owners can delete activities
DROP POLICY IF EXISTS "activities_delete_owner" ON public.activities;
CREATE POLICY "activities_delete_owner"
  ON public.activities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_roles r
      WHERE r.activity_id = activities.id
        AND r.user_id = auth.uid()
        AND r.role = 'owner'
    )
  );

-- =========================================
-- 4) RLS POLICIES - ACTIVITY_ROLES
-- =========================================

-- Members can read roles
DROP POLICY IF EXISTS "roles_select_members" ON public.activity_roles;
CREATE POLICY "roles_select_members"
  ON public.activity_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_roles r2
      WHERE r2.activity_id = activity_roles.activity_id
        AND r2.user_id = auth.uid()
    )
  );

-- Only owners can insert roles
DROP POLICY IF EXISTS "roles_insert_owner" ON public.activity_roles;
CREATE POLICY "roles_insert_owner"
  ON public.activity_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activity_roles r
      WHERE r.activity_id = activity_roles.activity_id
        AND r.user_id = auth.uid()
        AND r.role = 'owner'
    )
  );

-- Only owners can delete roles
DROP POLICY IF EXISTS "roles_delete_owner" ON public.activity_roles;
CREATE POLICY "roles_delete_owner"
  ON public.activity_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_roles r
      WHERE r.activity_id = activity_roles.activity_id
        AND r.user_id = auth.uid()
        AND r.role = 'owner'
    )
  );

-- =========================================
-- 5) RLS POLICIES - ACTIVITY_OCCURRENCES
-- =========================================

-- Public read if activity is public
DROP POLICY IF EXISTS "occ_select_public_activity" ON public.activity_occurrences;
CREATE POLICY "occ_select_public_activity"
  ON public.activity_occurrences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_occurrences.activity_id
        AND (
          a.is_public = true
          OR a.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.activity_roles r
            WHERE r.activity_id = a.id AND r.user_id = auth.uid()
          )
        )
    )
  );

-- Organizers can create occurrences
DROP POLICY IF EXISTS "occ_insert_organizer" ON public.activity_occurrences;
CREATE POLICY "occ_insert_organizer"
  ON public.activity_occurrences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_activity_organizer(activity_id, auth.uid())
  );

-- Organizers can update occurrences
DROP POLICY IF EXISTS "occ_update_organizer" ON public.activity_occurrences;
CREATE POLICY "occ_update_organizer"
  ON public.activity_occurrences
  FOR UPDATE
  TO authenticated
  USING (
    public.is_activity_organizer(activity_id, auth.uid())
  )
  WITH CHECK (
    public.is_activity_organizer(activity_id, auth.uid())
  );

-- Organizers can delete occurrences
DROP POLICY IF EXISTS "occ_delete_organizer" ON public.activity_occurrences;
CREATE POLICY "occ_delete_organizer"
  ON public.activity_occurrences
  FOR DELETE
  TO authenticated
  USING (
    public.is_activity_organizer(activity_id, auth.uid())
  );

-- =========================================
-- 6) RLS POLICIES - ACTIVITY_CHECKINS
-- =========================================

-- User can see own, organizer can see all for their activity
DROP POLICY IF EXISTS "checkins_select_own_or_organizer" ON public.activity_checkins;
CREATE POLICY "checkins_select_own_or_organizer"
  ON public.activity_checkins
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.activity_occurrences o
      JOIN public.activities a ON a.id = o.activity_id
      WHERE o.id = activity_checkins.occurrence_id
        AND public.is_activity_organizer(a.id, auth.uid())
    )
  );

-- User can create own pending check-in (must be public activity)
DROP POLICY IF EXISTS "checkins_insert_user" ON public.activity_checkins;
CREATE POLICY "checkins_insert_user"
  ON public.activity_checkins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.activity_occurrences o
      JOIN public.activities a ON a.id = o.activity_id
      WHERE o.id = occurrence_id
        AND a.is_public = true
    )
  );

-- User can delete own pending check-in
DROP POLICY IF EXISTS "checkins_delete_own_pending" ON public.activity_checkins;
CREATE POLICY "checkins_delete_own_pending"
  ON public.activity_checkins
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'pending'
  );

-- Organizer can confirm/reject (update)
DROP POLICY IF EXISTS "checkins_update_organizer_only" ON public.activity_checkins;
CREATE POLICY "checkins_update_organizer_only"
  ON public.activity_checkins
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.activity_occurrences o
      JOIN public.activities a ON a.id = o.activity_id
      WHERE o.id = activity_checkins.occurrence_id
        AND public.is_activity_organizer(a.id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.activity_occurrences o
      JOIN public.activities a ON a.id = o.activity_id
      WHERE o.id = activity_checkins.occurrence_id
        AND public.is_activity_organizer(a.id, auth.uid())
    )
  );
