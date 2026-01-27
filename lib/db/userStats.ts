import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import type { PlaceRow } from "./places";

export type AuthorStats = {
  place_count: number;
  total_visits: number;
};

export type WalkerStats = {
  visit_count: number;
  unique_places: number;
};

export type AuthoredPlace = {
  id: string;
  name: string;
  area: string;
  visit_count: number;
};

/**
 * Get author statistics for a user
 * @param userId - The user ID
 * @param days - Number of days to look back (null = all time)
 */
export async function getAuthorStats(
  userId: string,
  days: number | null = 30
): Promise<AuthorStats> {
  try {
    const supabase = await getSupabaseServerClient();

    // Get all places authored by this user
    const { data: places, error: placesError } = await supabase
      .from("places")
      .select("id")
      .eq("author_user_id", userId);

    if (placesError) {
      console.error("getAuthorStats places error:", placesError);
      return { place_count: 0, total_visits: 0 };
    }

    const placeCount = places?.length || 0;

    if (placeCount === 0) {
      return { place_count: 0, total_visits: 0 };
    }

    const placeIds = places.map((p) => p.id);

    // Get visits to these places
    let visitsQuery = supabase
      .from("place_visits")
      .select("id", { count: "exact", head: true })
      .in("place_id", placeIds);

    if (days !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      visitsQuery = visitsQuery.gte("visited_at", cutoffDate.toISOString());
    }

    const { count, error: visitsError } = await visitsQuery;

    if (visitsError) {
      console.error("getAuthorStats visits error:", visitsError);
      return { place_count: placeCount, total_visits: 0 };
    }

    return {
      place_count: placeCount,
      total_visits: count || 0,
    };
  } catch (error) {
    console.error("getAuthorStats exception:", error);
    return { place_count: 0, total_visits: 0 };
  }
}

/**
 * Get walker statistics for a user
 * @param userId - The user ID
 * @param days - Number of days to look back (null = all time)
 */
export async function getWalkerStats(
  userId: string,
  days: number | null = 30
): Promise<WalkerStats> {
  try {
    const supabase = await getSupabaseServerClient();

    let visitsQuery = supabase
      .from("place_visits")
      .select("place_id, visited_at")
      .eq("user_id", userId);

    if (days !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      visitsQuery = visitsQuery.gte("visited_at", cutoffDate.toISOString());
    }

    const { data: visits, error } = await visitsQuery;

    if (error) {
      console.error("getWalkerStats error:", error);
      return { visit_count: 0, unique_places: 0 };
    }

    const visitCount = visits?.length || 0;
    const uniquePlaces = new Set(visits?.map((v) => v.place_id) || []).size;

    return {
      visit_count: visitCount,
      unique_places: uniquePlaces,
    };
  } catch (error) {
    console.error("getWalkerStats exception:", error);
    return { visit_count: 0, unique_places: 0 };
  }
}

/**
 * Get top authored places for a user with their visit counts
 * @param userId - The user ID
 * @param limit - Max number of places to return
 * @param days - Number of days to look back for visit counts (null = all time)
 */
export async function getTopAuthoredPlaces(
  userId: string,
  limit = 10,
  days: number | null = 30
): Promise<AuthoredPlace[]> {
  try {
    const supabase = await getSupabaseServerClient();

    // Get all places authored by this user
    const { data: places, error: placesError } = await supabase
      .from("places")
      .select("id, name, area")
      .eq("author_user_id", userId)
      .order("created_at", { ascending: false });

    if (placesError || !places) {
      console.error("getTopAuthoredPlaces places error:", placesError);
      return [];
    }

    if (places.length === 0) {
      return [];
    }

    const placeIds = places.map((p) => p.id);

    // Get visit counts for these places
    let visitsQuery = supabase
      .from("place_visits")
      .select("place_id, visited_at");

    if (placeIds.length > 0) {
      visitsQuery = visitsQuery.in("place_id", placeIds);
    }

    if (days !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      visitsQuery = visitsQuery.gte("visited_at", cutoffDate.toISOString());
    }

    const { data: visits, error: visitsError } = await visitsQuery;

    if (visitsError) {
      console.error("getTopAuthoredPlaces visits error:", visitsError);
      // Return places with 0 visits
      return places.slice(0, limit).map((p) => ({
        id: p.id,
        name: p.name,
        area: p.area,
        visit_count: 0,
      }));
    }

    // Count visits per place
    const visitCounts = new Map<string, number>();
    (visits || []).forEach((v) => {
      const count = visitCounts.get(v.place_id) || 0;
      visitCounts.set(v.place_id, count + 1);
    });

    // Combine places with visit counts
    const placesWithVisits = places.map((p) => ({
      id: p.id,
      name: p.name,
      area: p.area,
      visit_count: visitCounts.get(p.id) || 0,
    }));

    // Sort by visit count (descending), then by name
    placesWithVisits.sort((a, b) => {
      if (b.visit_count !== a.visit_count) {
        return b.visit_count - a.visit_count;
      }
      return a.name.localeCompare(b.name);
    });

    return placesWithVisits.slice(0, limit);
  } catch (error) {
    console.error("getTopAuthoredPlaces exception:", error);
    return [];
  }
}
