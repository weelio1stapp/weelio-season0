"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export async function createRunForPlace(formData: FormData) {
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

  // Validate duration_min (optional)
  const duration_min_str = formData.get("duration_min") as string;
  let duration_min: number | null = null;
  if (duration_min_str && duration_min_str.trim() !== "") {
    const parsed = parseInt(duration_min_str, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1000) {
      return { success: false, error: "Čas musí být mezi 1 a 1000 minut" };
    }
    duration_min = parsed;
  }

  // Validate and convert ran_at
  const ran_at_str = formData.get("ran_at") as string;
  let ran_at: string;
  if (ran_at_str && ran_at_str.trim() !== "") {
    const parsedDate = new Date(ran_at_str);
    if (isNaN(parsedDate.getTime())) {
      ran_at = new Date().toISOString();
    } else {
      ran_at = parsedDate.toISOString();
    }
  } else {
    ran_at = new Date().toISOString();
  }

  // Validate ran_at is not in the future (allow 5 min tolerance)
  const now = new Date();
  const ranAtDate = new Date(ran_at);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  if (ranAtDate > fiveMinutesFromNow) {
    return { success: false, error: "Datum běhu nemůže být v budoucnu." };
  }

  // Calculate pace_sec_per_km if duration_min is provided
  let pace_sec_per_km: number | null = null;
  if (duration_min !== null && distance_km > 0) {
    pace_sec_per_km = Math.round((duration_min * 60) / distance_km);
  }

  const { error } = await supabase.from("user_runs").insert({
    user_id: user.id,
    place_id: placeId,
    distance_km,
    duration_min,
    pace_sec_per_km,
    ran_at,
  });

  if (error) {
    console.error("createRunForPlace error:", error);
    return { success: false, error: "Chyba při ukládání do databáze" };
  }

  revalidatePath(`/p/${placeId}`);
  return { success: true };
}
