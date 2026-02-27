import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type UserRunPlan = {
  id: string;
  user_id: string;
  place_id: string;
  planned_at: string;
  distance_km: number;
  target_duration_min: number | null;
  status: "planned" | "done" | "skipped";
  completed_run_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Fetch user's planned runs for a specific place (upcoming only, status=planned)
 */
export async function fetchMyPlannedRunsForPlace(
  placeId: string,
  limit = 10
): Promise<UserRunPlan[]> {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_run_plans")
    .select("*")
    .eq("place_id", placeId)
    .eq("user_id", user.id)
    .eq("status", "planned")
    .order("planned_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("fetchMyPlannedRunsForPlace error:", error);
    return [];
  }

  return (data ?? []) as UserRunPlan[];
}

/**
 * Fetch user's planned runs within a date range using timezone-proof date filtering
 * @param periodStart - Start date in YYYY-MM-DD format
 * @param periodEnd - End date in YYYY-MM-DD format (inclusive)
 * @returns Only plans with status='planned'
 */
export async function fetchMyPlannedRunsInDateRange(
  periodStart: string,
  periodEnd: string
): Promise<UserRunPlan[]> {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("fetch_my_planned_runs_in_date_range", {
    period_start: periodStart,
    period_end: periodEnd,
  });

  if (error) {
    console.error("fetchMyPlannedRunsInDateRange error:", error);
    return [];
  }

  return (data ?? []) as UserRunPlan[];
}

/**
 * Fetch user's planned runs within a date range (all statuses)
 * @param periodStart - Start date in YYYY-MM-DD format
 * @param periodEnd - End date in YYYY-MM-DD format (inclusive)
 * @returns All plans regardless of status
 */
export async function fetchMyPlannedRunsInDateRangeAll(
  periodStart: string,
  periodEnd: string
): Promise<UserRunPlan[]> {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("fetch_my_planned_runs_in_date_range_all", {
    period_start: periodStart,
    period_end: periodEnd,
  });

  if (error) {
    console.error("fetchMyPlannedRunsInDateRangeAll error:", error);
    return [];
  }

  return (data ?? []) as UserRunPlan[];
}

/**
 * Materialize due done-future run plans into actual runs
 * Converts plans marked as done (with future dates) into user_runs rows
 * when their planned_at date has passed
 * @returns Number of runs created (0 on error or if not authenticated)
 */
export async function materializeMyDueDoneFuturePlans(): Promise<number> {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase.rpc("materialize_my_due_done_future_run_plans");

  if (error) {
    console.error("materializeMyDueDoneFuturePlans error:", error);
    return 0;
  }

  return (data as number) ?? 0;
}
