"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type ActionResult = {
  success: boolean;
  errors?: Record<string, string>;
  message?: string;
};

/**
 * Create a new activity
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
    return {
      success: false,
      message: "Musíš být přihlášený",
    };
  }

  // Parse form data
  const title = formData.get("title")?.toString().trim();
  const slug = formData.get("slug")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const location_name = formData.get("location_name")?.toString().trim();
  const lat = formData.get("lat")?.toString().trim();
  const lng = formData.get("lng")?.toString().trim();
  const is_public = formData.get("is_public") === "true";

  // Validation
  const errors: Record<string, string> = {};

  if (!title || title.length < 3) {
    errors.title = "Název musí mít alespoň 3 znaky";
  }

  if (!slug || slug.length < 3) {
    errors.slug = "Slug musí mít alespoň 3 znaky";
  } else if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.slug = "Slug může obsahovat pouze malá písmena, číslice a pomlčky";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  // Parse coordinates if provided
  let location_point = null;
  if (lat && lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      errors.lat = "Neplatné souřadnice";
      return { success: false, errors };
    }

    // PostGIS Point format: "POINT(lng lat)"
    location_point = `POINT(${lngNum} ${latNum})`;
  }

  // Insert activity
  const { data: activity, error } = await supabase
    .from("activities")
    .insert({
      title,
      slug,
      description: description || null,
      location_name: location_name || null,
      location_point,
      is_public,
      created_by: user.id,
    })
    .select("slug")
    .single();

  if (error) {
    console.error("Create activity error:", error);

    if (error.code === "23505") {
      // Unique constraint violation
      return {
        success: false,
        errors: { slug: "Tento slug již existuje" },
      };
    }

    return {
      success: false,
      message: `Chyba při vytváření: ${error.message}`,
    };
  }

  // Revalidate and redirect
  revalidatePath("/activities");
  redirect(`/activities/${activity.slug}`);
}

/**
 * Create a new occurrence for an activity
 */
export async function createOccurrence(
  activityId: string,
  startsAt: string
): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Musíš být přihlášený",
    };
  }

  // Check if user is organizer
  const { data: isOrganizer } = await supabase.rpc("is_activity_organizer", {
    p_activity_id: activityId,
    p_user_id: user.id,
  });

  if (!isOrganizer) {
    return {
      success: false,
      message: "Pouze organizátor může přidávat běhy",
    };
  }

  // Validate datetime
  if (!startsAt) {
    return {
      success: false,
      message: "Musíš zadat datum a čas",
    };
  }

  // Insert occurrence
  const { error } = await supabase.from("activity_occurrences").insert({
    activity_id: activityId,
    starts_at: startsAt,
    created_by: user.id,
  });

  if (error) {
    console.error("Create occurrence error:", error);

    if (error.code === "23505") {
      return {
        success: false,
        message: "Běh v tento čas již existuje",
      };
    }

    return {
      success: false,
      message: `Chyba při vytváření běhu: ${error.message}`,
    };
  }

  return {
    success: true,
    message: "Běh vytvořen",
  };
}

/**
 * Create a check-in (pending) for an occurrence
 */
export async function createCheckin(occurrenceId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Musíš být přihlášený",
    };
  }

  // Call RPC
  const { data, error } = await supabase
    .rpc("create_activity_checkin", {
      p_occurrence_id: occurrenceId,
    })
    .single();

  if (error) {
    console.error("Create check-in error:", error);
    return {
      success: false,
      message: `Chyba při check-inu: ${error.message}`,
    };
  }

  const result = data as { checkin_id: string; status: string; message: string };

  if (result.status === "error") {
    return {
      success: false,
      message: result.message,
    };
  }

  return {
    success: true,
    message: result.status === "existing" ? "Již jsi checked-in" : "Check-in vytvořen",
  };
}

/**
 * Confirm a pending check-in (organizer only)
 */
export async function confirmCheckin(checkinId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Musíš být přihlášený",
    };
  }

  // Call RPC
  const { data, error } = await supabase
    .rpc("confirm_activity_checkin", {
      p_checkin_id: checkinId,
    })
    .single();

  if (error) {
    console.error("Confirm check-in error:", error);
    return {
      success: false,
      message: `Chyba při potvrzení: ${error.message}`,
    };
  }

  const result = data as { success: boolean; message: string; xp_awarded: number };

  if (!result.success) {
    return {
      success: false,
      message: result.message,
    };
  }

  return {
    success: true,
    message: `Check-in potvrzen (+${result.xp_awarded} XP)`,
  };
}
