import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type Season = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
};

export type Challenge = {
  id: string;
  season_id: string;
  title: string;
  description: string | null;
  kind: "unique_places" | "visits" | "authored_places";
  target: number;
};

export type ChallengeProgress = {
  challenge_id: string;
  current: number;
  target: number;
};

/**
 * Get active season
 */
export async function getActiveSeason(): Promise<Season | null> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase.rpc("get_active_season");

    if (error) {
      console.error("getActiveSeason error:", error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0] as Season;
  } catch (error) {
    console.error("getActiveSeason exception:", error);
    return null;
  }
}

/**
 * Get active challenges
 */
export async function getActiveChallenges(): Promise<Challenge[]> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase.rpc("get_active_challenges");

    if (error) {
      console.error("getActiveChallenges error:", error);
      return [];
    }

    return (data ?? []) as Challenge[];
  } catch (error) {
    console.error("getActiveChallenges exception:", error);
    return [];
  }
}

/**
 * Get challenge progress for a specific user
 */
export async function getMyChallengeProgress(
  userId: string
): Promise<ChallengeProgress[]> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase.rpc("get_my_challenge_progress", {
      p_user_id: userId,
    });

    if (error) {
      console.error("getMyChallengeProgress error:", error);
      return [];
    }

    return (data ?? []) as ChallengeProgress[];
  } catch (error) {
    console.error("getMyChallengeProgress exception:", error);
    return [];
  }
}
