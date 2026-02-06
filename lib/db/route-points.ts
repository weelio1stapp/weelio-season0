import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type RoutePointKind = "START" | "END" | "CHECKPOINT" | "POI" | "TREASURE";

export interface RoutePoint {
  id: string;
  route_id: string;
  kind: RoutePointKind;
  lat: number;
  lng: number;
  title: string | null;
  note: string | null;
  order_index: number;
  created_at: string;
}

/**
 * Načte všechny body trasy seřazené podle order_index
 */
export async function fetchRoutePoints(routeId: string): Promise<RoutePoint[]> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("route_points")
    .select("*")
    .eq("route_id", routeId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching route points:", error);
    throw new Error("Failed to fetch route points");
  }

  return data || [];
}

/**
 * Načte konkrétní bod trasy
 */
export async function fetchRoutePointById(pointId: string): Promise<RoutePoint | null> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("route_points")
    .select("*")
    .eq("id", pointId)
    .single();

  if (error) {
    console.error("Error fetching route point:", error);
    return null;
  }

  return data;
}

/**
 * Vytvoří nový bod trasy
 * Pro checkpoint automaticky nastaví order_index = max + 10
 */
export async function createRoutePoint(
  routeId: string,
  kind: RoutePointKind,
  lat: number,
  lng: number,
  title: string | null,
  note: string | null
): Promise<RoutePoint> {
  const supabase = await getSupabaseServerClient();

  // Zjisti aktuální max order_index
  const { data: existingPoints } = await supabase
    .from("route_points")
    .select("order_index")
    .eq("route_id", routeId)
    .order("order_index", { ascending: false })
    .limit(1);

  const maxOrderIndex = existingPoints && existingPoints.length > 0
    ? existingPoints[0].order_index
    : 0;

  const newOrderIndex = maxOrderIndex + 10;

  const { data, error } = await supabase
    .from("route_points")
    .insert({
      route_id: routeId,
      kind,
      lat,
      lng,
      title,
      note,
      order_index: newOrderIndex,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating route point:", error);
    throw new Error("Failed to create route point");
  }

  return data;
}

/**
 * Aktualizuje existující bod trasy
 */
export async function updateRoutePoint(
  pointId: string,
  updates: {
    lat?: number;
    lng?: number;
    title?: string | null;
    note?: string | null;
  }
): Promise<RoutePoint> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("route_points")
    .update(updates)
    .eq("id", pointId)
    .select()
    .single();

  if (error) {
    console.error("Error updating route point:", error);
    throw new Error("Failed to update route point");
  }

  return data;
}

/**
 * Smaže bod trasy (pouze checkpoint, ne START/END)
 */
export async function deleteRoutePoint(pointId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();

  // Nejprve ověř, že to není START nebo END
  const point = await fetchRoutePointById(pointId);
  if (!point) {
    throw new Error("Route point not found");
  }

  if (point.kind === "START" || point.kind === "END") {
    throw new Error("Cannot delete START or END points");
  }

  const { error } = await supabase
    .from("route_points")
    .delete()
    .eq("id", pointId);

  if (error) {
    console.error("Error deleting route point:", error);
    throw new Error("Failed to delete route point");
  }
}

/**
 * Přeuspořádá body trasy
 * Přijme pole ID v novém pořadí a nastaví order_index na 10, 20, 30, ...
 */
export async function reorderRoutePoints(
  routeId: string,
  orderedPointIds: string[]
): Promise<void> {
  const supabase = await getSupabaseServerClient();

  // Aktualizuj každý bod s novým order_index
  const updates = orderedPointIds.map((id, index) => ({
    id,
    order_index: (index + 1) * 10,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from("route_points")
      .update({ order_index: update.order_index })
      .eq("id", update.id)
      .eq("route_id", routeId); // Extra bezpečnostní check

    if (error) {
      console.error("Error reordering route points:", error);
      throw new Error("Failed to reorder route points");
    }
  }
}

/**
 * Synchronizuje START/END bod do places tabulky
 */
export async function syncPointToPlace(
  routeId: string,
  kind: "START" | "END",
  lat: number,
  lng: number
): Promise<void> {
  const supabase = await getSupabaseServerClient();

  const field = kind === "START" ? "start_lat" : "end_lat";
  const fieldLng = kind === "START" ? "start_lng" : "end_lng";

  const { error } = await supabase
    .from("places")
    .update({
      [field]: lat,
      [fieldLng]: lng,
    })
    .eq("id", routeId);

  if (error) {
    console.error("Error syncing point to place:", error);
    throw new Error("Failed to sync point to place");
  }
}
