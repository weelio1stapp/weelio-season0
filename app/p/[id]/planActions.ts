"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export async function createPlannedRunForPlace(formData: FormData) {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Musíš být přihlášený" };
  }

  // Validate place_id
  const placeId = formData.get("place_id");
  if (typeof placeId !== "string" || placeId.length < 10) {
    return { success: false, error: "Neplatné ID trasy" };
  }

  // Validate distance_km
  const distance_km_raw = formData.get("distance_km");
  const distance_km = parseFloat(distance_km_raw as string);
  if (!Number.isFinite(distance_km) || distance_km <= 0 || distance_km > 100) {
    return { success: false, error: "Vzdálenost musí být mezi 0.1 a 100 km" };
  }

  // Validate target_duration_min (optional)
  const target_duration_min_str = formData.get("target_duration_min") as string;
  let target_duration_min: number | null = null;
  if (target_duration_min_str && target_duration_min_str.trim() !== "") {
    const parsed = parseInt(target_duration_min_str, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1000) {
      return { success: false, error: "Cílový čas musí být mezi 1 a 1000 minut" };
    }
    target_duration_min = parsed;
  }

  // Validate and convert planned_at
  const planned_at_str = formData.get("planned_at") as string;
  let planned_at: string;
  if (planned_at_str && planned_at_str.trim() !== "") {
    const parsedDate = new Date(planned_at_str);
    if (isNaN(parsedDate.getTime())) {
      return { success: false, error: "Neplatné datum plánovaného běhu" };
    }
    planned_at = parsedDate.toISOString();
  } else {
    return { success: false, error: "Datum plánovaného běhu je povinné" };
  }

  // Validate planned_at is not too far in the past (allow 5 min tolerance like existing validation)
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const plannedAtDate = new Date(planned_at);
  if (plannedAtDate < fiveMinutesAgo) {
    return { success: false, error: "Datum plánovaného běhu nesmí být v minulosti" };
  }

  const { error } = await supabase.from("user_run_plans").insert({
    user_id: user.id,
    place_id: placeId,
    distance_km,
    target_duration_min,
    planned_at,
    status: "planned",
  });

  if (error) {
    console.error("createPlannedRunForPlace error:", error);
    return { success: false, error: "Chyba při ukládání plánovaného běhu" };
  }

  revalidatePath(`/p/${placeId}`);
  revalidatePath("/me");
  return { success: true };
}

export async function completePlannedRun(planId: string) {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Musíš být přihlášený" };
  }

  // Load the plan (must belong to user)
  const { data: plan, error: fetchError } = await supabase
    .from("user_run_plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !plan) {
    console.error("completePlannedRun fetch error:", fetchError);
    return { success: false, error: "Plánovaný běh nebyl nalezen" };
  }

  const plannedAtDate = new Date(plan.planned_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  // Check if planned_at is in the future (> now + 5 min)
  if (plannedAtDate > fiveMinutesFromNow) {
    // Future plan: mark as done but don't create run yet
    const { error: updateError } = await supabase
      .from("user_run_plans")
      .update({
        status: "done",
        completed_at: now.toISOString(),
        completed_run_id: null,
      })
      .eq("id", planId);

    if (updateError) {
      console.error("completePlannedRun update error:", updateError);
      return { success: false, error: "Chyba při aktualizaci plánu" };
    }

    revalidatePath(`/p/${plan.place_id}`);
    revalidatePath("/me");
    return { success: true, mode: "planned_done_future" as const };
  }

  // Plan is now or in past: create the actual run
  const ran_at = plan.planned_at;

  // Calculate pace if duration is provided
  let pace_sec_per_km: number | null = null;
  if (plan.target_duration_min !== null && plan.distance_km > 0) {
    pace_sec_per_km = Math.round((plan.target_duration_min * 60) / plan.distance_km);
  }

  // Insert completed run into user_runs
  const { data: insertedRun, error: insertError } = await supabase
    .from("user_runs")
    .insert({
      user_id: user.id,
      place_id: plan.place_id,
      distance_km: plan.distance_km,
      duration_min: plan.target_duration_min,
      pace_sec_per_km,
      ran_at,
    })
    .select()
    .single();

  if (insertError || !insertedRun) {
    console.error("completePlannedRun insert error:", insertError);
    return { success: false, error: "Chyba při ukládání dokončeného běhu" };
  }

  // Update plan status to 'done' and link to created run
  const { error: updateError } = await supabase
    .from("user_run_plans")
    .update({
      status: "done",
      completed_at: now.toISOString(),
      completed_run_id: insertedRun.id,
    })
    .eq("id", planId);

  if (updateError) {
    console.error("completePlannedRun update error:", updateError);
    return { success: false, error: "Chyba při aktualizaci plánu" };
  }

  revalidatePath(`/p/${plan.place_id}`);
  revalidatePath("/me");
  return { success: true, mode: "created_run" as const };
}
