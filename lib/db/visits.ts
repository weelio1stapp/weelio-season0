import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type VisitSource = "button" | "qr";

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
