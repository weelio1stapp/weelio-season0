import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type UserProgress = {
  user_id: string;
  xp: number;
  streak_weeks: number;
  best_streak_weeks: number;
  last_visit_on: string | null;
  updated_at: string;
};

/**
 * Get user progress for the current authenticated user
 */
export async function getUserProgress(): Promise<UserProgress | null> {
  try {
    const supabase = await getSupabaseServerClient();

    // Ensure progress row exists
    await supabase.rpc("ensure_user_progress");

    const { data, error } = await supabase
      .from("user_progress")
      .select("*")
      .single();

    if (error) {
      console.error("getUserProgress error:", error);
      return null;
    }

    return data as UserProgress;
  } catch (error) {
    console.error("getUserProgress exception:", error);
    return null;
  }
}

/**
 * Get user progress for a specific user ID
 */
export async function getUserProgressById(
  userId: string
): Promise<UserProgress | null> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("getUserProgressById error:", error);
      return null;
    }

    return data as UserProgress | null;
  } catch (error) {
    console.error("getUserProgressById exception:", error);
    return null;
  }
}
