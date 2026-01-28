-- =====================================================
-- Profile Avatar Support for Weelio
-- =====================================================
-- Run this in Supabase SQL Editor to ensure profiles table
-- has avatar_url column and storage bucket is configured

-- 1) Ensure profiles table has avatar_url column
-- (If it already exists, this will be skipped)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2) Create storage bucket for avatars (if not exists)
-- This needs to be run in Supabase Dashboard -> Storage
-- or via SQL if you have the right permissions:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- 3) Set up storage policy for avatars bucket
-- Allow authenticated users to upload their own avatars
-- Run these in Supabase Dashboard -> Storage -> avatars bucket -> Policies

-- Policy: Allow authenticated users to upload to their own folder
-- CREATE POLICY "Users can upload own avatar"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'avatars'
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Policy: Allow authenticated users to update their own avatars
-- CREATE POLICY "Users can update own avatar"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'avatars'
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Policy: Allow authenticated users to delete their own avatars
-- CREATE POLICY "Users can delete own avatar"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'avatars'
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Policy: Allow public read access to all avatars
-- CREATE POLICY "Public avatar access"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'avatars');

-- 4) Ensure profiles table RLS policies allow updates
-- (Assuming you already have RLS enabled - just ensuring UPDATE policy exists)
-- DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
-- CREATE POLICY "Users can update own profile"
--   ON public.profiles
--   FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = id)
--   WITH CHECK (auth.uid() = id);

-- MANUAL STEPS REQUIRED IN SUPABASE DASHBOARD:
-- 1. Go to Storage section
-- 2. Create new bucket named "avatars" with Public access enabled
-- 3. Add the storage policies listed above in the bucket's policies section
