import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type SegmentType = "intro" | "point";

export type AudioSegmentRow = {
  id: string;
  place_id: string;
  route_point_id: string | null;
  segment_type: SegmentType;
  title: string | null;
  script_text: string | null;
  estimated_sec: number | null;
  order_index: number | null;
  created_at: string;
};

/**
 * Fetch all audio segments for a place
 */
export async function fetchAudioSegments(
  placeId: string
): Promise<AudioSegmentRow[]> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("route_audio_segments")
    .select("*")
    .eq("place_id", placeId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("fetchAudioSegments error:", error);
    return [];
  }

  return (data ?? []) as AudioSegmentRow[];
}

/**
 * Fetch intro segment for a place
 */
export async function fetchIntroSegment(
  placeId: string
): Promise<AudioSegmentRow | null> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("route_audio_segments")
    .select("*")
    .eq("place_id", placeId)
    .eq("segment_type", "intro")
    .maybeSingle();

  if (error) {
    console.error("fetchIntroSegment error:", error);
    return null;
  }

  return data as AudioSegmentRow | null;
}

/**
 * Fetch audio segment for a specific route point
 */
export async function fetchPointSegment(
  routePointId: string
): Promise<AudioSegmentRow | null> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("route_audio_segments")
    .select("*")
    .eq("route_point_id", routePointId)
    .eq("segment_type", "point")
    .maybeSingle();

  if (error) {
    console.error("fetchPointSegment error:", error);
    return null;
  }

  return data as AudioSegmentRow | null;
}
