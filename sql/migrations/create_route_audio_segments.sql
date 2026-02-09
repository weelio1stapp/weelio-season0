-- Create route_audio_segments table for text-based audio script per route point
-- This table stores the narration script that will be read/generated for each point on the route

CREATE TABLE IF NOT EXISTS route_audio_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  route_point_id UUID NULL REFERENCES route_points(id) ON DELETE CASCADE,
  segment_type TEXT NOT NULL CHECK (segment_type IN ('intro', 'point')),
  title TEXT,
  script_text TEXT,
  estimated_sec INTEGER,
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_route_audio_segments_place_id ON route_audio_segments(place_id);
CREATE INDEX IF NOT EXISTS idx_route_audio_segments_route_point_id ON route_audio_segments(route_point_id);
CREATE INDEX IF NOT EXISTS idx_route_audio_segments_place_type ON route_audio_segments(place_id, segment_type);

-- Ensure only one intro segment per place
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_audio_segments_unique_intro
  ON route_audio_segments(place_id)
  WHERE segment_type = 'intro';

-- Ensure only one segment per route point
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_audio_segments_unique_point
  ON route_audio_segments(route_point_id)
  WHERE route_point_id IS NOT NULL;

-- Comments
COMMENT ON TABLE route_audio_segments IS 'Text-based audio narration scripts for routes and their points';
COMMENT ON COLUMN route_audio_segments.segment_type IS 'Type: intro (route introduction) or point (specific route point)';
COMMENT ON COLUMN route_audio_segments.route_point_id IS 'NULL for intro segments, references specific point for point segments';
COMMENT ON COLUMN route_audio_segments.script_text IS 'Text narration script to be read/generated as audio';
COMMENT ON COLUMN route_audio_segments.estimated_sec IS 'Estimated duration in seconds for this segment';
COMMENT ON COLUMN route_audio_segments.order_index IS 'Display order within the route';
