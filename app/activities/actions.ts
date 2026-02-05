"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type ActionResult = {
  success: boolean;
  errors?: Record<string, string>;
  message?: string;
};

function parseBoolean(value: FormDataEntryValue | null): boolean {
  if (value === null) return false;
  const v = value.toString().toLowerCase();
  return v === "true" || v === "1" || v === "on" || v === "yes";
}

function parseNullableNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Create a new activity
 * DB expects: title, slug, description, type, location_name, lat, lng, is_public
 * NOTE: created_by is handled by DB default auth.uid()
 */
export async function createActivity(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Musíš být přihlášený" };
  }

  const title = formData.get("title")?.toString().trim() ?? "";
  const slug = formData.get("slug")?.toString().trim() ?? "";
  const type = formData.get("type")?.toString().trim() || "run_club";
  const description = formData.get("description")?.toString().trim() || null;
  const location_name = formData.get("location_name")?.toString().trim() || null;

  const latRaw = formData.get("lat")?.toString().trim();
  const lngRaw = formData.get("lng")?.toString().trim();
  const is_public = parseBoolean(formData.get("is_public"));

  const errors: Record<string, string> = {};

  if (title.length < 3) {
    errors.title = "Název musí mít alespoň 3 znaky";
  }

  if (slug.length < 3) {
    errors.slug = "Slug musí mít alespoň 3 znaky";
  } else if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.slug = "Slug může obsahovat pouze malá písmena, číslice a pomlčky";
  }

  const lat = parseNullableNumber(latRaw);
  const lng = parseNullableNumber(lngRaw);

  // If one coordinate is provided, require the other.
  if ((latRaw && !lngRaw) || (!latRaw && lngRaw)) {
    errors.lat = "Zadej obě souřadnice (lat i lng), nebo žádnou";
    errors.lng = "Zadej obě souřadnice (lat i lng), nebo žádnou";
  }

  if ((latRaw || lngRaw) && (lat === null || lng === null)) {
    errors.lat = "Neplatné souřadnice";
    errors.lng = "Neplatné souřadnice";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const { data: activity, error } = await supabase
    .from("activities")
    .insert({
      title,
      slug,
      type,
      description,
      location_name,
      lat,
      lng,
      is_public,
      // created_by: user.id, // intentionally omitted; DB default auth.uid()
    })
    .select("slug")
    .single();

  if (error) {
    console.error("Create activity error:", error);

    if (error.code === "23505") {
      return { success: false, errors: { slug: "Tento slug již existuje" } };
    }

    return { success: false, message: `Chyba při vytváření: ${error.message}` };
  }

  revalidatePath("/activities");
  redirect(`/activities/${activity.slug}`);
}

/**
 * Create a new occurrence for an activity (organizer-only)
 */
export async function createOccurrence(
  activityId: string,
  startsAt: string
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, message: "Musíš být přihlášený" };

  // Organizer check (server-side)
  const { data: isOrganizer, error: orgErr } = await supabase.rpc(
    "is_activity_organizer",
    {
      p_activity_id: activityId,
      p_user_id: user.id,
    }
  );

  if (orgErr) {
    console.error("Organizer check error:", orgErr);
    return { success: false, message: "Nepodařilo se ověřit roli organizátora" };
  }

  if (!isOrganizer) {
    return { success: false, message: "Pouze organizátor může přidávat běhy" };
  }

  if (!startsAt) {
    return { success: false, message: "Musíš zadat datum a čas" };
  }

  const { error } = await supabase.from("activity_occurrences").insert({
    activity_id: activityId,
    starts_at: startsAt,
    // created_by: user.id, // optional; DB default auth.uid()
  });

  if (error) {
    console.error("Create occurrence error:", error);

    if (error.code === "23505") {
      return { success: false, message: "Běh v tento čas již existuje" };
    }

    return { success: false, message: `Chyba při vytváření běhu: ${error.message}` };
  }

  revalidatePath(`/activities/${activityId}`); // harmless even if route uses slug; page revalidate can be broader
  revalidatePath("/activities");
  return { success: true, message: "Běh vytvořen" };
}

/**
 * Create a check-in (pending) for an occurrence
 * RPC returns a row from activity_checkins (id, status, ...)
 */
export async function createCheckin(occurrenceId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, message: "Musíš být přihlášený" };

  const { data, error } = await supabase.rpc("create_activity_checkin", {
    p_occurrence_id: occurrenceId,
  });

  if (error) {
    console.error("Create check-in error:", error);

    // Unique violation (already checked-in) often comes as 23505 only if RPC doesn't upsert.
    if (error.code === "23505") {
      return { success: true, message: "Již jsi checked-in" };
    }

    return { success: false, message: `Chyba při check-inu: ${error.message}` };
  }

  // data is the inserted/returned row
  revalidatePath("/activities");
  return { success: true, message: "Check-in vytvořen (čeká na potvrzení)" };
}

/**
 * Confirm a pending check-in (organizer only)
 * RPC returns a row from activity_checkins (status, xp_awarded_at, ...)
 */
export async function confirmCheckin(checkinId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, message: "Musíš být přihlášený" };

  const { data, error } = await supabase.rpc("confirm_activity_checkin", {
    p_checkin_id: checkinId,
  });

  if (error) {
    console.error("Confirm check-in error:", error);
    return { success: false, message: `Chyba při potvrzení: ${error.message}` };
  }

  // If confirm RPC succeeded, the checkin is confirmed. XP may have been awarded or pending retry.
  // We can infer from xp_awarded_at if needed by the UI.
  revalidatePath("/activities");
  return { success: true, message: "Check-in potvrzen (XP se připsalo po potvrzení)" };
}