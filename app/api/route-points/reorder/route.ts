import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { reorderRoutePoints } from "@/lib/db/route-points";

/**
 * POST /api/route-points/reorder
 * Přeuspořádá body trasy
 */
export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData?.user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { routeId, orderedPointIds } = body;

    // Validace
    if (!routeId || !Array.isArray(orderedPointIds)) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ověř, že uživatel je autor trasy
    const { data: place, error: placeError } = await supabase
      .from("places")
      .select("author_id")
      .eq("id", routeId)
      .single();

    if (placeError || !place) {
      return NextResponse.json(
        { ok: false, error: "Route not found" },
        { status: 404 }
      );
    }

    if (place.author_id !== userData.user.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    await reorderRoutePoints(routeId, orderedPointIds);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error reordering route points:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
