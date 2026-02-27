"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export async function createMyRunGoal(formData: FormData) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Musíš být přihlášený" };
  }

  // Validate period_start and period_end
  const period_start = formData.get("period_start") as string;
  const period_end = formData.get("period_end") as string;

  if (!period_start || !period_end) {
    return { success: false, error: "Musíš zadat začátek a konec období" };
  }

  const startDate = new Date(period_start);
  const endDate = new Date(period_end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { success: false, error: "Neplatné datum" };
  }

  if (endDate < startDate) {
    return { success: false, error: "Konec období musí být po začátku" };
  }

  // Validate target_distance_km
  const target_distance_km_raw = formData.get("target_distance_km");
  const target_distance_km = parseFloat(target_distance_km_raw as string);
  if (
    !Number.isFinite(target_distance_km) ||
    target_distance_km <= 0 ||
    target_distance_km > 1000
  ) {
    return {
      success: false,
      error: "Cílová vzdálenost musí být mezi 0.1 a 1000 km",
    };
  }

  // Validate target_runs
  const target_runs_raw = formData.get("target_runs");
  const target_runs = parseInt(target_runs_raw as string, 10);
  if (!Number.isFinite(target_runs) || target_runs < 1 || target_runs > 200) {
    return { success: false, error: "Počet běhů musí být mezi 1 a 200" };
  }

  // Validate plan_total_runs
  const plan_total_runs_raw = formData.get("plan_total_runs");
  const plan_total_runs = parseInt(plan_total_runs_raw as string, 10);
  if (
    !Number.isFinite(plan_total_runs) ||
    plan_total_runs < 1 ||
    plan_total_runs > 200
  ) {
    return {
      success: false,
      error: "Plánované tréninky musí být mezi 1 a 200",
    };
  }

  // Deactivate all existing active goals for this user
  const { error: deactivateError } = await supabase
    .from("user_goals")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (deactivateError) {
    console.error("Deactivate goals error:", deactivateError);
    return { success: false, error: "Chyba při deaktivaci starých cílů" };
  }

  // Insert new goal
  const { error: insertError } = await supabase.from("user_goals").insert({
    user_id: user.id,
    title: "Projekt Krysa 🐀",
    type: "run_distance",
    period_kind: "month",
    period_start,
    period_end,
    target_distance_km,
    target_runs,
    plan_total_runs,
    is_active: true,
  });

  if (insertError) {
    console.error("Create goal error:", insertError);
    return { success: false, error: "Chyba při vytváření cíle" };
  }

  revalidatePath("/me");
  return { success: true };
}

export async function deactivateMyActiveRunGoal() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Musíš být přihlášený" };
  }

  // Deactivate active run_distance goals
  const { error } = await supabase
    .from("user_goals")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("type", "run_distance");

  if (error) {
    console.error("Deactivate goal error:", error);
    return { success: false, error: "Chyba při ukončování cíle" };
  }

  revalidatePath("/me");
  return { success: true };
}
