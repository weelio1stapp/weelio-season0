import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import type {
  PlacesFilters,
  DifficultyPreset,
  TimePreset,
} from "@/lib/placesFilters";

export type PlaceType =
  | "urban_walk"
  | "nature_walk"
  | "viewpoint"
  | "park_forest"
  | "industrial"
  | "lake_river"
  | "other";

export type PlaceRow = {
  id: string;
  name: string;
  type: PlaceType;
  time_min: number;
  difficulty: number;
  why: string;

  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;

  area: string;
  author_id: string; // Autor místa (hlavní entita)
  created_at: string;

  // Cover photo fields
  cover_storage_path: string | null;
  cover_public_url: string | null;

  // Route personalization
  route_title?: string | null;
  route_description?: string | null;
  route_name?: string | null; // Autorský název trasy (oddělený od destinace)

  // Audio route metadata
  audio_storage_path?: string | null;
  audio_public_url?: string | null;
  audio_duration_sec?: number | null;
  audio_status?: "draft" | "ready" | "missing";
  audio_note?: string | null;
};

export async function fetchPlaces(): Promise<PlaceRow[]> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("places")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PlaceRow[];
}

/**
 * Fetch places with filters
 */
export async function fetchPlacesFiltered(
  filters: PlacesFilters,
  currentUserId?: string | null
): Promise<PlaceRow[]> {
  const supabase = await getSupabaseServerClient();

  // Start building query
  let query = supabase.from("places").select("*");

  // Filter by current user (for "My Places")
  if (filters.myPlaces && currentUserId) {
    query = query.eq("author_id", currentUserId);
  }

  // Filter by types (OR within category)
  if (filters.types.length > 0) {
    query = query.in("type", filters.types);
  }

  // Filter by difficulty presets (OR within category)
  if (filters.difficulty.length > 0) {
    const diffConditions = filters.difficulty.map((preset) =>
      getDifficultyCondition(preset)
    );
    // Join with OR
    query = query.or(diffConditions.join(","));
  }

  // Filter by time presets (OR within category)
  if (filters.time.length > 0) {
    const timeConditions = filters.time.map((preset) =>
      getTimeCondition(preset)
    );
    // Join with OR
    query = query.or(timeConditions.join(","));
  }

  // Filter by area (exact match)
  if (filters.area) {
    query = query.eq("area", filters.area);
  }

  // Apply sorting
  switch (filters.sort) {
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "shortest":
      query = query.order("time_min", { ascending: true });
      break;
    case "easiest":
      query = query.order("difficulty", { ascending: true });
      break;
    case "hardest":
      query = query.order("difficulty", { ascending: false });
      break;
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as PlaceRow[];
}

/**
 * Build difficulty condition for Supabase .or()
 */
function getDifficultyCondition(preset: DifficultyPreset): string {
  switch (preset) {
    case "easy":
      return "and(difficulty.gte.1,difficulty.lte.2)";
    case "medium":
      return "difficulty.eq.3";
    case "hard":
      return "and(difficulty.gte.4,difficulty.lte.5)";
  }
}

/**
 * Build time condition for Supabase .or()
 */
function getTimeCondition(preset: TimePreset): string {
  switch (preset) {
    case "lt60":
      return "time_min.lte.60";
    case "btw60_120":
      return "and(time_min.gte.61,time_min.lte.120)";
    case "gt120":
      return "time_min.gte.121";
  }
}

/**
 * Fetch place by ID using provided Supabase client (for authenticated requests with session)
 */
export async function fetchPlaceByIdWithClient(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  id: string
): Promise<PlaceRow | null> {
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("fetchPlaceByIdWithClient error:", error);
    throw new Error(error.message);
  }
  return (data ?? null) as PlaceRow | null;
}

/**
 * Fetch place by ID (creates own server client - for public access)
 */
export async function fetchPlaceById(id: string): Promise<PlaceRow | null> {
  const supabase = await getSupabaseServerClient();
  return fetchPlaceByIdWithClient(supabase, id);
}

/**
 * Fetch nearby places from the same area (excluding current place)
 */
export async function getNearbyPlaces(
  area: string,
  currentPlaceId: string,
  limit = 3
): Promise<Array<{ id: string; name: string; type: PlaceType; area: string; cover_public_url: string | null }>> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("places")
      .select("id, name, type, area, cover_public_url")
      .eq("area", area)
      .neq("id", currentPlaceId)
      .limit(limit);

    if (error) {
      console.error("getNearbyPlaces error:", error);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.error("getNearbyPlaces exception:", error);
    return [];
  }
}
