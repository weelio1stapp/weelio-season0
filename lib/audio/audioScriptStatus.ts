import { fetchRoutePoints } from "@/lib/db/route-points";
import { fetchAudioSegments } from "@/lib/db/audio-segments";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type AudioScriptStatus = "empty" | "partial" | "complete";

export type AudioScriptStatusData = {
  status: AudioScriptStatus;
  totalPoints: number;
  filledPoints: number;
  hasIntro: boolean;
};

/**
 * Compute audio script status for a route
 *
 * Status logic:
 * - empty: no intro segment AND no point segments
 * - partial: intro OR some point segments exist, BUT not all route_points have a segment
 * - complete: intro exists AND every route_point has exactly one audio segment
 */
export async function getAudioScriptStatus(
  placeId: string
): Promise<AudioScriptStatusData> {
  // Fetch route points and audio segments in parallel
  const [routePoints, audioSegments] = await Promise.all([
    fetchRoutePoints(placeId),
    fetchAudioSegments(placeId),
  ]);

  return computeAudioScriptStatus(routePoints, audioSegments);
}

/**
 * Compute audio script status from already-fetched data
 * Useful for batch operations
 */
export function computeAudioScriptStatus(
  routePoints: Array<{ id: string }>,
  audioSegments: Array<{
    segment_type: "intro" | "point";
    route_point_id: string | null;
  }>
): AudioScriptStatusData {
  const totalPoints = routePoints.length;

  // Check if intro segment exists
  const hasIntro = audioSegments.some((seg) => seg.segment_type === "intro");

  // Count how many route points have an audio segment
  const pointSegments = audioSegments.filter(
    (seg) => seg.segment_type === "point" && seg.route_point_id
  );

  // Create set of route point IDs that have segments
  const pointIdsWithSegments = new Set(
    pointSegments.map((seg) => seg.route_point_id!)
  );

  const filledPoints = pointIdsWithSegments.size;

  // Determine status
  let status: AudioScriptStatus;

  if (!hasIntro && filledPoints === 0) {
    // No intro and no point segments
    status = "empty";
  } else if (hasIntro && filledPoints === totalPoints) {
    // Intro exists AND all points have segments
    status = "complete";
  } else {
    // Anything in between
    status = "partial";
  }

  return {
    status,
    totalPoints,
    filledPoints,
    hasIntro,
  };
}

/**
 * Batch fetch audio script statuses for multiple places
 * More efficient than calling getAudioScriptStatus for each place
 */
export async function getBatchAudioScriptStatus(
  placeIds: string[]
): Promise<Map<string, AudioScriptStatusData>> {
  if (placeIds.length === 0) {
    return new Map();
  }

  const supabase = await getSupabaseServerClient();

  // Fetch all route points for these places
  const { data: routePoints } = await supabase
    .from("route_points")
    .select("id, route_id")
    .in("route_id", placeIds);

  // Fetch all audio segments for these places
  const { data: audioSegments } = await supabase
    .from("route_audio_segments")
    .select("place_id, segment_type, route_point_id")
    .in("place_id", placeIds);

  // Group route points by place_id
  const pointsByPlace = new Map<string, Array<{ id: string }>>();
  if (routePoints) {
    routePoints.forEach((point) => {
      if (!pointsByPlace.has(point.route_id)) {
        pointsByPlace.set(point.route_id, []);
      }
      pointsByPlace.get(point.route_id)!.push({ id: point.id });
    });
  }

  // Group audio segments by place_id
  const segmentsByPlace = new Map<
    string,
    Array<{
      segment_type: "intro" | "point";
      route_point_id: string | null;
    }>
  >();
  if (audioSegments) {
    audioSegments.forEach((segment) => {
      if (!segmentsByPlace.has(segment.place_id)) {
        segmentsByPlace.set(segment.place_id, []);
      }
      segmentsByPlace.get(segment.place_id)!.push({
        segment_type: segment.segment_type as "intro" | "point",
        route_point_id: segment.route_point_id,
      });
    });
  }

  // Compute status for each place
  const statusMap = new Map<string, AudioScriptStatusData>();
  placeIds.forEach((placeId) => {
    const points = pointsByPlace.get(placeId) || [];
    const segments = segmentsByPlace.get(placeId) || [];
    const status = computeAudioScriptStatus(points, segments);
    statusMap.set(placeId, status);
  });

  return statusMap;
}
