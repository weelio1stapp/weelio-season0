import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type UserGoal = {
  id: string;
  user_id: string;
  title: string;
  type: "run_distance";
  period_kind: string;
  period_start: string; // ISO date string
  period_end: string; // ISO date string
  target_distance_km: number;
  target_runs: number;
  plan_total_runs: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Fetch the user's active goal (most recent by period_start)
 * Returns null if no active goal exists
 */
export async function fetchMyActiveGoal(): Promise<UserGoal | null> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchMyActiveGoal error:", error);
    return null;
  }

  return data as UserGoal | null;
}

/**
 * Fetch all user's goals (for future use)
 */
export async function fetchMyGoals(): Promise<UserGoal[]> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("period_start", { ascending: false });

  if (error) {
    console.error("fetchMyGoals error:", error);
    return [];
  }

  return (data ?? []) as UserGoal[];
}

/**
 * Fetch a specific goal by ID (only if belongs to auth user)
 */
export async function fetchMyGoalById(id: string): Promise<UserGoal | null> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("fetchMyGoalById error:", error);
    return null;
  }

  return data as UserGoal | null;
}
