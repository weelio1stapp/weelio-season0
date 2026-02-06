import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import {
  fetchRoutePointById,
  updateRoutePoint,
  deleteRoutePoint,
  syncPointToPlace,
} from "@/lib/db/route-points";

/**
 * PUT /api/route-points/[id]
 * Aktualizuje bod trasy
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData?.user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { lat, lng, title, note } = body;

    // Načti bod
    const point = await fetchRoutePointById(id);
    if (!point) {
      return NextResponse.json(
        { ok: false, error: "Point not found" },
        { status: 404 }
      );
    }

    // Ověř, že uživatel je autor trasy
    const { data: place, error: placeError } = await supabase
      .from("places")
      .select("author_id")
      .eq("id", point.route_id)
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

    // Připrav updates
    const updates: {
      lat?: number;
      lng?: number;
      title?: string | null;
      note?: string | null;
    } = {};

    if (lat !== undefined) updates.lat = parseFloat(lat);
    if (lng !== undefined) updates.lng = parseFloat(lng);
    if (title !== undefined) updates.title = title || null;
    if (note !== undefined) updates.note = note || null;

    const updatedPoint = await updateRoutePoint(id, updates);

    // Pokud je to START nebo END, synchronizuj do places
    if (
      (point.kind === "START" || point.kind === "END") &&
      (updates.lat !== undefined || updates.lng !== undefined)
    ) {
      const finalLat = updates.lat ?? point.lat;
      const finalLng = updates.lng ?? point.lng;
      await syncPointToPlace(point.route_id, point.kind, finalLat, finalLng);
    }

    return NextResponse.json({ ok: true, point: updatedPoint });
  } catch (error) {
    console.error("Error updating route point:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/route-points/[id]
 * Smaže bod trasy (pouze checkpointy, ne START/END)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData?.user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    // Načti bod
    const point = await fetchRoutePointById(id);
    if (!point) {
      return NextResponse.json(
        { ok: false, error: "Point not found" },
        { status: 404 }
      );
    }

    // Ověř, že není START nebo END
    if (point.kind === "START" || point.kind === "END") {
      return NextResponse.json(
        { ok: false, error: "Cannot delete START or END points" },
        { status: 400 }
      );
    }

    // Ověř, že uživatel je autor trasy
    const { data: place, error: placeError } = await supabase
      .from("places")
      .select("author_id")
      .eq("id", point.route_id)
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

    await deleteRoutePoint(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting route point:", error);
    return NextResponse.json(
      { ok: false, error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
