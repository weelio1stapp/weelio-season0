-- RLS Policies for public.places table
-- Copy and paste this into Supabase SQL Editor

-- Enable RLS on places table (if not already enabled)
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public to read all places
DROP POLICY IF EXISTS "Places are viewable by everyone" ON public.places;
CREATE POLICY "Places are viewable by everyone"
ON public.places
FOR SELECT
USING (true);

-- Policy: Allow authenticated users to insert places
DROP POLICY IF EXISTS "Authenticated users can insert places" ON public.places;
CREATE POLICY "Authenticated users can insert places"
ON public.places
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_user_id);

-- Policy: Allow place authors to update their own places
DROP POLICY IF EXISTS "Authors can update own places" ON public.places;
CREATE POLICY "Authors can update own places"
ON public.places
FOR UPDATE
TO authenticated
USING (auth.uid() = author_user_id)
WITH CHECK (auth.uid() = author_user_id);

-- Policy: Allow place authors to delete their own places
DROP POLICY IF EXISTS "Authors can delete own places" ON public.places;
CREATE POLICY "Authors can delete own places"
ON public.places
FOR DELETE
TO authenticated
USING (auth.uid() = author_user_id);
