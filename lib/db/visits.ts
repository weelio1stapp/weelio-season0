import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type VisitSource = "button" | "qr";

export type PlaceStats = {
  total_visits: number;
  visits_30d: number;
  top_walkers_30d: Array<{
    user_id: string;
    visit_count: number;
  }>;
};

/**
 * Record a visit for the current user at a specific place
 * Uses unique constraint (user_id, place_id, DATE(created_at)) to prevent duplicates
 * Silently handles duplicates (doesn't throw error)
 */
export async function markVisited(
  placeId: string,
  source: VisitSource = "button"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseServerClient();

    // Get current user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Musíte být přihlášeni" };
    }

    // Insert visit (unique constraint handles duplicates)
    const { error: insertError } = await supabase.from("place_visits").insert({
      place_id: placeId,
      user_id: user.id,
      source,
    });

    // Check if error is duplicate constraint violation
    if (insertError) {
      // PostgreSQL unique constraint violation code
      if (insertError.code === "23505") {
        // Duplicate - not an error for the user
        return { success: true };
      }
      return { success: false, error: insertError.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Neznámá chyba",
    };
  }
}

/**
 * Check if current user has visited this place today
 * Returns false if not authenticated
 */
export async function hasVisitedToday(
  placeId: string
): Promise<boolean> {
  try {
    const supabase = await getSupabaseServerClient();

    // Get current user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "has_visited_today",
      {
        p_place_id: placeId,
      }
    );

    // If RPC doesn't exist, fall back to manual query
    if (rpcError && rpcError.code === "42883") {
      // Function does not exist - use fallback
      return await hasVisitedTodayFallback(placeId, user.id);
    }

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return false;
    }

    return rpcData === true;
  } catch (error) {
    console.error("hasVisitedToday error:", error);
    return false;
  }
}

/**
 * Fallback implementation when RPC function doesn't exist
 * Checks if there's a visit for this user/place with created_at >= today midnight
 */
async function hasVisitedTodayFallback(
  placeId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await getSupabaseServerClient();

    // Get today's date at midnight in local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data, error } = await supabase
      .from("place_visits")
      .select("id")
      .eq("place_id", placeId)
      .eq("user_id", userId)
      .gte("created_at", todayISO)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Fallback query error:", error);
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error("hasVisitedTodayFallback error:", error);
    return false;
  }
}

/**
 * Get statistics for a specific place
 * - total_visits: all time visit count
 * - visits_30d: visits in last 30 days
 * - top_walkers_30d: top 3 users by visit count in last 30 days
 */
export async function getPlaceStats(placeId: string): Promise<PlaceStats> {
  try {
    const supabase = await getSupabaseServerClient();

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_place_stats",
      { p_place_id: placeId }
    );

    // If RPC doesn't exist, fall back to manual query
    if (rpcError && rpcError.code === "42883") {
      return await getPlaceStatsFallback(placeId);
    }

    if (rpcError) {
      console.error("RPC get_place_stats error:", rpcError);
      return {
        total_visits: 0,
        visits_30d: 0,
        top_walkers_30d: [],
      };
    }

    return rpcData as PlaceStats;
  } catch (error) {
    console.error("getPlaceStats error:", error);
    return {
      total_visits: 0,
      visits_30d: 0,
      top_walkers_30d: [],
    };
  }
}

/**
 * Fallback implementation when RPC function doesn't exist
 */
async function getPlaceStatsFallback(placeId: string): Promise<PlaceStats> {
  try {
    const supabase = await getSupabaseServerClient();

    // Get all visits for this place
    const { data: allVisits, error: allError } = await supabase
      .from("place_visits")
      .select("id, user_id, visited_at")
      .eq("place_id", placeId);

    if (allError) {
      console.error("Fallback all visits query error:", allError);
      return {
        total_visits: 0,
        visits_30d: 0,
        top_walkers_30d: [],
      };
    }

    const totalVisits = allVisits?.length || 0;

    // Calculate 30-day cutoff
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffISO = cutoffDate.toISOString();

    // Filter visits in last 30 days
    const recentVisits = (allVisits || []).filter(
      (v: any) => v.visited_at >= cutoffISO
    );
    const visits30d = recentVisits.length;

    // Count visits per user in last 30 days
    const userVisitCounts = new Map<string, number>();
    recentVisits.forEach((v: any) => {
      const count = userVisitCounts.get(v.user_id) || 0;
      userVisitCounts.set(v.user_id, count + 1);
    });

    // Get top 3 walkers
    const topWalkers30d = Array.from(userVisitCounts.entries())
      .map(([user_id, visit_count]) => ({ user_id, visit_count }))
      .sort((a, b) => b.visit_count - a.visit_count)
      .slice(0, 3);

    return {
      total_visits: totalVisits,
      visits_30d: visits30d,
      top_walkers_30d: topWalkers30d,
    };
  } catch (error) {
    console.error("getPlaceStatsFallback error:", error);
    return {
      total_visits: 0,
      visits_30d: 0,
      top_walkers_30d: [],
    };
  }
}
