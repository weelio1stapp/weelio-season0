import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type UserRun = {
  id: string;
  user_id: string;
  place_id: string;
  distance_km: number;
  duration_min: number | null;
  pace_sec_per_km: number | null;
  ran_at: string;
  created_at: string;
};

/**
 * Fetch user's runs for a specific place (most recent first)
 */
export async function fetchMyRunsForPlace(
  placeId: string,
  limit = 10
): Promise<UserRun[]> {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_runs")
    .select("*")
    .eq("place_id", placeId)
    .eq("user_id", user.id)
    .order("ran_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetchMyRunsForPlace error:", error);
    return [];
  }

  return (data ?? []) as UserRun[];
}

/**
 * Fetch user's runs within a date range (inclusive)
 */
export async function fetchMyRunsInRange(
  fromDateISO: string,
  toDateISO: string
): Promise<UserRun[]> {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_runs")
    .select("*")
    .eq("user_id", user.id)
    .gte("ran_at", fromDateISO)
    .lte("ran_at", toDateISO)
    .order("ran_at", { ascending: false });

  if (error) {
    console.error("fetchMyRunsInRange error:", error);
    return [];
  }

  return (data ?? []) as UserRun[];
}
