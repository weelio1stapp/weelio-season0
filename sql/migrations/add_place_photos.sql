-- =====================================================
-- Photo Visit v1: place_photos table for visit-linked photos
-- =====================================================

-- 1) Create place_photos table for photos attached to visits
CREATE TABLE IF NOT EXISTS public.place_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES public.place_visits(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Enforce 1 photo per visit
  CONSTRAINT unique_photo_per_visit UNIQUE (visit_id)
);

-- 2) Create index for efficient gallery queries
CREATE INDEX IF NOT EXISTS idx_place_photos_place_created
  ON public.place_photos(place_id, created_at DESC);

-- 3) Enable RLS
ALTER TABLE public.place_photos ENABLE ROW LEVEL SECURITY;

-- 4) RLS Policies

-- Policy: Allow everyone to SELECT (gallery is public)
DROP POLICY IF EXISTS "Allow public read access to place photos" ON public.place_photos;
CREATE POLICY "Allow public read access to place photos"
  ON public.place_photos
  FOR SELECT
  USING (true);

-- Policy: Allow authenticated users to INSERT their own photos
DROP POLICY IF EXISTS "Allow authenticated users to insert own photos" ON public.place_photos;
CREATE POLICY "Allow authenticated users to insert own photos"
  ON public.place_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to DELETE their own photos
DROP POLICY IF EXISTS "Allow users to delete own photos" ON public.place_photos;
CREATE POLICY "Allow users to delete own photos"
  ON public.place_photos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Deny all UPDATE operations (photos are immutable)
DROP POLICY IF EXISTS "Deny all updates to place photos" ON public.place_photos;
CREATE POLICY "Deny all updates to place photos"
  ON public.place_photos
  FOR UPDATE
  USING (false);
