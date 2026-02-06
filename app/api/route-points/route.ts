import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { fetchRoutePoints, createRoutePoint } from "@/lib/db/route-points";
import type { RoutePointKind } from "@/lib/db/route-points";

/**
 * GET /api/route-points?routeId=xxx
 * Načte všechny body trasy
 */
export async function GET(req: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData?.user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const routeId = searchParams.get("routeId");

  if (!routeId) {
    return NextResponse.json(
      { ok: false, error: "routeId is required" },
      { status: 400 }
    );
  }

  try {
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

    const points = await fetchRoutePoints(routeId);
    return NextResponse.json({ ok: true, points });
  } catch (error) {
    console.error("Error fetching route points:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/route-points
 * Vytvoří nový bod trasy
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
    const { routeId, kind, lat, lng, title, note } = body;

    // Validace
    if (!routeId || !kind || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const validKinds: RoutePointKind[] = ["START", "END", "CHECKPOINT", "POI", "TREASURE"];
    if (!validKinds.includes(kind)) {
      return NextResponse.json(
        { ok: false, error: "Invalid kind value" },
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

    const point = await createRoutePoint(
      routeId,
      kind,
      parseFloat(lat),
      parseFloat(lng),
      title || null,
      note || null
    );

    return NextResponse.json({ ok: true, point });
  } catch (error) {
    console.error("Error creating route point:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
