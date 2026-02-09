"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { createPlaceSchema } from "@/lib/validations/place";
import { parseLatLng } from "@/lib/utils/coords";

export type ActionResult = {
  success: boolean;
  errors?: Record<string, string>;
  message?: string;
};

export async function updatePlaceAction(
  placeId: string,
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // 1. Get authenticated user
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Musíš být přihlášený, abys mohl upravit trasu",
    };
  }

  // 2. Verify ownership
  const { data: place, error: fetchError } = await supabase
    .from("places")
    .select("author_id")
    .eq("id", placeId)
    .single();

  if (fetchError) {
    console.error("Error fetching place for ownership check:", fetchError);
    return {
      success: false,
      message: `Chyba při načítání trasy: ${fetchError.message}`,
    };
  }

  if (!place) {
    return {
      success: false,
      message: "Trasa nebyla nalezena",
    };
  }

  // Kontrola vlastnictví: pouze author_id (podle DB schema)
  if (!place.author_id || place.author_id !== user.id) {
    return {
      success: false,
      message: "Nemůžeš upravit cizí trasu",
    };
  }

  // 3. Parse and validate form data
  const rawData = {
    name: formData.get("name"),
    type: formData.get("type"),
    area: formData.get("area"),
    why: formData.get("why"),
    time_min: formData.get("time_min"),
    difficulty: formData.get("difficulty"),
    start_coords: formData.get("start_coords"),
    end_coords: formData.get("end_coords"),
    route_name: formData.get("route_name"),
    route_title: formData.get("route_title"),
    route_description: formData.get("route_description"),
    audio_public_url: formData.get("audio_public_url"),
    audio_duration_sec: formData.get("audio_duration_sec"),
    audio_status: formData.get("audio_status"),
    audio_note: formData.get("audio_note"),
  };

  const result = createPlaceSchema.safeParse(rawData);

  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path[0]?.toString();
      if (path) {
        errors[path] = issue.message;
      }
    });
    return { success: false, errors };
  }

  const validData = result.data;

  // 4. Parse coordinates
  const startCoords = parseLatLng(validData.start_coords);
  const endCoords = parseLatLng(validData.end_coords);

  if (!startCoords || !endCoords) {
    return {
      success: false,
      errors: {
        start_coords: !startCoords ? "Neplatné start souřadnice" : "",
        end_coords: !endCoords ? "Neplatné cíl souřadnice" : "",
      },
    };
  }

  // 5. Update in database (s kontrolou vlastnictví přes author_id)
  const { error } = await supabase
    .from("places")
    .update({
      name: validData.name,
      type: validData.type,
      area: validData.area,
      why: validData.why,
      time_min: validData.time_min,
      difficulty: validData.difficulty,
      start_lat: startCoords.lat,
      start_lng: startCoords.lng,
      end_lat: endCoords.lat,
      end_lng: endCoords.lng,
      route_name: validData.route_name || null,
      route_title: validData.route_title || validData.name, // fallback na name
      route_description: validData.route_description || null,
      audio_public_url: validData.audio_public_url || null,
      audio_duration_sec: validData.audio_duration_sec || null,
      audio_status: validData.audio_status || "missing",
      audio_note: validData.audio_note || null,
    })
    .eq("id", placeId)
    .eq("author_id", user.id); // Extra ochrana na DB úrovni

  if (error) {
    console.error("DB update error:", error);
    return {
      success: false,
      message: `Chyba při ukládání: ${error.message}`,
    };
  }

  // 6. Revalidate and redirect
  revalidatePath(`/p/${placeId}`);
  revalidatePath("/places");
  redirect(`/p/${placeId}`);
}

/**
 * Update only audio metadata for a place
 * Called after successful audio upload to Supabase Storage
 */
export async function updatePlaceAudioMetadata(
  placeId: string,
  audioData: {
    audio_storage_path: string;
    audio_public_url: string;
    audio_duration_sec: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get authenticated user
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Musíš být přihlášený",
      };
    }

    // 2. Verify ownership
    const { data: place, error: fetchError } = await supabase
      .from("places")
      .select("author_id")
      .eq("id", placeId)
      .single();

    if (fetchError || !place) {
      return {
        success: false,
        error: "Trasa nebyla nalezena",
      };
    }

    if (place.author_id !== user.id) {
      return {
        success: false,
        error: "Nemůžeš upravit cizí trasu",
      };
    }

    // 3. Update audio metadata
    const { error: updateError } = await supabase
      .from("places")
      .update({
        audio_storage_path: audioData.audio_storage_path,
        audio_public_url: audioData.audio_public_url,
        audio_duration_sec: audioData.audio_duration_sec,
        audio_status: "ready",
      })
      .eq("id", placeId)
      .eq("author_id", user.id);

    if (updateError) {
      console.error("Audio metadata update error:", updateError);
      return {
        success: false,
        error: `Chyba při ukládání metadat: ${updateError.message}`,
      };
    }

    // 4. Revalidate cache
    revalidatePath(`/p/${placeId}`);
    revalidatePath(`/p/${placeId}/edit`);
    revalidatePath("/places");

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in updatePlaceAudioMetadata:", error);
    return {
      success: false,
      error: "Neočekávaná chyba při ukládání",
    };
  }
}

/**
 * Upsert intro audio segment for a place
 */
export async function upsertIntroSegment(
  placeId: string,
  data: {
    title: string | null;
    script_text: string | null;
    estimated_sec: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Musíš být přihlášený" };
    }

    // Verify ownership
    const { data: place, error: fetchError } = await supabase
      .from("places")
      .select("author_id")
      .eq("id", placeId)
      .single();

    if (fetchError || !place || place.author_id !== user.id) {
      return { success: false, error: "Nemůžeš upravit cizí trasu" };
    }

    // Upsert intro segment
    const { error: upsertError } = await supabase
      .from("route_audio_segments")
      .upsert(
        {
          place_id: placeId,
          route_point_id: null,
          segment_type: "intro",
          title: data.title,
          script_text: data.script_text,
          estimated_sec: data.estimated_sec,
          order_index: 0,
        },
        {
          onConflict: "place_id",
          ignoreDuplicates: false,
        }
      );

    if (upsertError) {
      console.error("Intro segment upsert error:", upsertError);
      return { success: false, error: `Chyba při ukládání: ${upsertError.message}` };
    }

    revalidatePath(`/p/${placeId}`);
    revalidatePath(`/p/${placeId}/edit`);

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in upsertIntroSegment:", error);
    return { success: false, error: "Neočekávaná chyba" };
  }
}

/**
 * Upsert point audio segment for a specific route point
 */
export async function upsertPointSegment(
  placeId: string,
  routePointId: string,
  data: {
    script_text: string | null;
    estimated_sec: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Musíš být přihlášený" };
    }

    // Verify ownership of the place
    const { data: place, error: fetchError } = await supabase
      .from("places")
      .select("author_id")
      .eq("id", placeId)
      .single();

    if (fetchError || !place || place.author_id !== user.id) {
      return { success: false, error: "Nemůžeš upravit cizí trasu" };
    }

    // Verify route point belongs to this place
    const { data: routePoint, error: pointError } = await supabase
      .from("route_points")
      .select("place_id, order_index")
      .eq("id", routePointId)
      .single();

    if (pointError || !routePoint || routePoint.place_id !== placeId) {
      return { success: false, error: "Bod nepatří k této trase" };
    }

    // Upsert point segment
    const { error: upsertError } = await supabase
      .from("route_audio_segments")
      .upsert(
        {
          place_id: placeId,
          route_point_id: routePointId,
          segment_type: "point",
          title: null,
          script_text: data.script_text,
          estimated_sec: data.estimated_sec,
          order_index: routePoint.order_index,
        },
        {
          onConflict: "route_point_id",
          ignoreDuplicates: false,
        }
      );

    if (upsertError) {
      console.error("Point segment upsert error:", upsertError);
      return { success: false, error: `Chyba při ukládání: ${upsertError.message}` };
    }

    revalidatePath(`/p/${placeId}`);
    revalidatePath(`/p/${placeId}/edit`);

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in upsertPointSegment:", error);
    return { success: false, error: "Neočekávaná chyba" };
  }
}
