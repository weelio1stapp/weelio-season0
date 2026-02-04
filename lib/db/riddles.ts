import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type PublicRiddle = {
  id: string;
  prompt: string;
  answer_type: "text" | "number";
  xp_reward: number;
  max_attempts: number;
  is_active: boolean;
  created_by: string;
};

export type AuthorRiddle = PublicRiddle & {
  created_at: string;
};

/**
 * Get public riddles for a place (no answer_hash/salt exposed)
 * Returns only fields safe for client-side
 */
export async function getPublicRiddlesForPlace(
  placeId: string
): Promise<PublicRiddle[]> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("place_riddles")
      .select("id, prompt, answer_type, xp_reward, max_attempts, is_active, created_by")
      .eq("place_id", placeId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getPublicRiddlesForPlace error:", error);
      return [];
    }

    return (data as PublicRiddle[]) || [];
  } catch (error) {
    console.error("getPublicRiddlesForPlace exception:", error);
    return [];
  }
}

/**
 * Get riddles created by current user for a place
 * Used by place authors to manage their riddles
 */
export async function getMyRiddlesForPlace(
  placeId: string
): Promise<AuthorRiddle[]> {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return [];
    }

    const { data, error } = await supabase
      .from("place_riddles")
      .select("id, prompt, answer_type, xp_reward, is_active, created_at")
      .eq("place_id", placeId)
      .eq("author_user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getMyRiddlesForPlace error:", error);
      return [];
    }

    return (data as AuthorRiddle[]) || [];
  } catch (error) {
    console.error("getMyRiddlesForPlace exception:", error);
    return [];
  }
}

/**
 * Check which riddles the current user has already solved
 * Returns a Set of riddle IDs
 */
export async function getMySolvedRiddles(
  riddleIds: string[]
): Promise<Set<string>> {
  const solvedSet = new Set<string>();

  if (riddleIds.length === 0) {
    return solvedSet;
  }

  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return solvedSet;
    }

    const { data, error } = await supabase
      .from("place_riddle_attempts")
      .select("riddle_id")
      .eq("user_id", user.id)
      .eq("is_correct", true)
      .in("riddle_id", riddleIds);

    if (error) {
      console.error("getMySolvedRiddles error:", error);
      return solvedSet;
    }

    if (data) {
      data.forEach((solve) => {
        solvedSet.add(solve.riddle_id);
      });
    }

    return solvedSet;
  } catch (error) {
    console.error("getMySolvedRiddles exception:", error);
    return solvedSet;
  }
}
