-- =====================================================
-- Migration: Add missing columns to place_riddles
-- =====================================================

-- Add max_attempts column (default 3, range 1-4)
ALTER TABLE public.place_riddles
ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3
CHECK (max_attempts >= 1 AND max_attempts <= 4);

-- Add cooldown_hours column (default 24, how long until riddle can be attempted again)
ALTER TABLE public.place_riddles
ADD COLUMN IF NOT EXISTS cooldown_hours integer NOT NULL DEFAULT 24
CHECK (cooldown_hours > 0);

-- Add answer_plain column for direct answer storage (alternative to hash/salt)
ALTER TABLE public.place_riddles
ADD COLUMN IF NOT EXISTS answer_plain text;

-- Add created_by column (for author permission checks)
ALTER TABLE public.place_riddles
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Create place_riddle_attempts table (replaces riddle_attempts)
CREATE TABLE IF NOT EXISTS public.place_riddle_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  riddle_id uuid NOT NULL REFERENCES public.place_riddles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  answer_plain text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_place_riddle_attempts_user_riddle
ON public.place_riddle_attempts(user_id, riddle_id);

CREATE INDEX IF NOT EXISTS idx_place_riddle_attempts_riddle
ON public.place_riddle_attempts(riddle_id);

-- Add RLS policies for place_riddle_attempts
ALTER TABLE public.place_riddle_attempts ENABLE ROW LEVEL SECURITY;

-- Users can read their own attempts
CREATE POLICY "Users can view own attempts"
ON public.place_riddle_attempts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own attempts
CREATE POLICY "Users can create own attempts"
ON public.place_riddle_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Comment for documentation
COMMENT ON TABLE public.place_riddle_attempts IS 'Tracks all riddle attempt history per user';
COMMENT ON COLUMN public.place_riddles.max_attempts IS 'Number of attempts allowed per riddle (1-4)';
COMMENT ON COLUMN public.place_riddles.created_by IS 'User who created the riddle (for delete permissions)';
