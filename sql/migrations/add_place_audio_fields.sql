-- Add audio route metadata fields to places table
-- This supports future audio upload and playback features without implementing them now

-- Add audio storage path (where file will be stored in Supabase storage)
ALTER TABLE places
ADD COLUMN IF NOT EXISTS audio_storage_path text;

-- Add public URL for audio file
ALTER TABLE places
ADD COLUMN IF NOT EXISTS audio_public_url text;

-- Add audio duration in seconds
ALTER TABLE places
ADD COLUMN IF NOT EXISTS audio_duration_sec integer;

-- Add audio status with constraint
ALTER TABLE places
ADD COLUMN IF NOT EXISTS audio_status text DEFAULT 'missing';

-- Add constraint for audio_status values
ALTER TABLE places
DROP CONSTRAINT IF EXISTS places_audio_status_check;

ALTER TABLE places
ADD CONSTRAINT places_audio_status_check
CHECK (audio_status IN ('draft', 'ready', 'missing'));

-- Add note for listeners (e.g. "Pusť si před startem")
ALTER TABLE places
ADD COLUMN IF NOT EXISTS audio_note text;

-- Optional: Add index on audio_status for filtering
CREATE INDEX IF NOT EXISTS idx_places_audio_status ON places(audio_status);

-- Comment
COMMENT ON COLUMN places.audio_storage_path IS 'Storage path in Supabase storage (e.g. audio/route_123.mp3)';
COMMENT ON COLUMN places.audio_public_url IS 'Public URL to audio file';
COMMENT ON COLUMN places.audio_duration_sec IS 'Audio duration in seconds';
COMMENT ON COLUMN places.audio_status IS 'Audio preparation status: draft | ready | missing';
COMMENT ON COLUMN places.audio_note IS 'Short note for listeners (e.g. "Pusť si před startem")';
