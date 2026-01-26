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

export async function createPlaceAction(
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
      message: "Musíš být přihlášený, abys mohl přidat místo",
    };
  }

  // 2. Parse and validate form data
  const rawData = {
    name: formData.get("name"),
    type: formData.get("type"),
    area: formData.get("area"),
    why: formData.get("why"),
    time_min: formData.get("time_min"),
    difficulty: formData.get("difficulty"),
    start_coords: formData.get("start_coords"),
    end_coords: formData.get("end_coords"),
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

  // 3. Parse coordinates
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

  // 4. Insert into database
  const { error } = await supabase.from("places").insert({
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
    author_user_id: user.id,
  });

  if (error) {
    console.error("DB insert error:", error);
    return {
      success: false,
      message: `Chyba při ukládání: ${error.message}`,
    };
  }

  // 5. Revalidate and redirect
  revalidatePath("/places");
  redirect("/places");
}
