import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import type { PlaceType } from "./places";

export type TopPlace = {
  place_id: string;
  place_name: string;
  area: string;
  type: PlaceType;
  visit_count: number;
  thumbnail_url?: string;
};

export type TopWalker = {
  user_id: string;
  visit_count: number;
  unique_places: number;
};

export type TopAuthor = {
  user_id: string;
  place_count: number;
  total_visits: number;
};

export async function getTopPlaces(
  limit = 10,
  days: number | null = null
): Promise<TopPlace[]> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_top_places",
      { p_limit: limit, p_days: days }
    );

    if (rpcError) {
      // když funkce neexistuje → fallback
      if (rpcError.code === "42883") {
        return await getTopPlacesFallback(limit, days);
      }

      console.error("RPC get_top_places error:", {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      });
      return [];
    }

    const rows = (rpcData ?? []) as TopPlace[];

    // doplníme thumbnaily (RPC je nevrací)
    return await addThumbnailsToPlaces(rows);
  } catch (error) {
    console.error("getTopPlaces error:", error);
    return [];
  }
}

export async function getTopWalkers(
  limit = 10,
  days: number | null = null
): Promise<TopWalker[]> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_top_walkers",
      { p_limit: limit, p_days: days }
    );

    if (rpcError) {
      if (rpcError.code === "42883") {
        return await getTopWalkersFallback(limit, days);
      }

      console.error("RPC get_top_walkers error:", {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      });
      return [];
    }

    return (rpcData ?? []) as TopWalker[];
  } catch (error) {
    console.error("getTopWalkers error:", error);
    return [];
  }
}

export async function getTopAuthors(
  limit = 10,
  days: number | null = null
): Promise<TopAuthor[]> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_top_authors",
      { p_limit: limit, p_days: days }
    );

    if (rpcError) {
      if (rpcError.code === "42883") {
        return await getTopAuthorsFallback(limit, days);
      }

      console.error("RPC get_top_authors error:", {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      });
      return [];
    }

    return (rpcData ?? []) as TopAuthor[];
  } catch (error) {
    console.error("getTopAuthors error:", error);
    return [];
  }
}

/* -----------------------------
   FALLBACKS (kdyby RPC nebyly)
------------------------------ */

async function getTopPlacesFallback(
  limit: number,
  days: number | null
): Promise<TopPlace[]> {
  try {
    const supabase = await getSupabaseServerClient();

    let query = supabase
      .from("place_visits")
      .select(`place_id, places!inner(name, area, type), visited_at`);

    if (days !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      query = query.gte("visited_at", cutoffDate.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error("Fallback getTopPlaces query error:", error);
      return [];
    }
    if (!data) return [];

    const counts = new Map<
      string,
      { name: string; area: string; type: PlaceType; count: number }
    >();

    data.forEach((visit: any) => {
      const placeId = visit.place_id;
      const existing = counts.get(placeId);
      if (existing) {
        existing.count++;
      } else {
        counts.set(placeId, {
          name: visit.places.name,
          area: visit.places.area,
          type: visit.places.type,
          count: 1,
        });
      }
    });

    const results: TopPlace[] = Array.from(counts.entries())
      .map(([placeId, info]) => ({
        place_id: placeId,
        place_name: info.name,
        area: info.area,
        type: info.type,
        visit_count: info.count,
      }))
      .sort((a, b) => b.visit_count - a.visit_count)
      .slice(0, limit);

    return await addThumbnailsToPlaces(results);
  } catch (error) {
    console.error("getTopPlacesFallback error:", error);
    return [];
  }
}

async function getTopWalkersFallback(
  limit: number,
  days: number | null
): Promise<TopWalker[]> {
  try {
    const supabase = await getSupabaseServerClient();

    let query = supabase.from("place_visits").select("user_id, place_id, visited_at");

    if (days !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      query = query.gte("visited_at", cutoffDate.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error("Fallback getTopWalkers query error:", error);
      return [];
    }
    if (!data) return [];

    const userStats = new Map<
      string,
      { visitCount: number; uniquePlaces: Set<string> }
    >();

    data.forEach((visit: any) => {
      const userId = visit.user_id;
      const placeId = visit.place_id;
      const existing = userStats.get(userId);
      if (existing) {
        existing.visitCount++;
        existing.uniquePlaces.add(placeId);
      } else {
        userStats.set(userId, {
          visitCount: 1,
          uniquePlaces: new Set([placeId]),
        });
      }
    });

    return Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        user_id: userId,
        visit_count: stats.visitCount,
        unique_places: stats.uniquePlaces.size,
      }))
      .sort((a, b) => b.visit_count - a.visit_count)
      .slice(0, limit);
  } catch (error) {
    console.error("getTopWalkersFallback error:", error);
    return [];
  }
}

async function getTopAuthorsFallback(
  limit: number,
  days: number | null
): Promise<TopAuthor[]> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data: places, error: placesError } = await supabase
      .from("places")
      .select("id, author_user_id");

    if (placesError || !places) {
      console.error("Fallback places query error:", placesError);
      return [];
    }

    let visitsQuery = supabase
      .from("place_visits")
      .select("place_id, visited_at");

    if (days !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      visitsQuery = visitsQuery.gte("visited_at", cutoffDate.toISOString());
    }

    const { data: visits, error: visitsError } = await visitsQuery;
    if (visitsError) {
      console.error("Fallback visits query error:", visitsError);
      return [];
    }

    const placeToAuthor = new Map<string, string>();
    places.forEach((p: any) => placeToAuthor.set(p.id, p.author_user_id));

    const authorStats = new Map<string, { placeIds: Set<string>; visitCount: number }>();

    (visits ?? []).forEach((v: any) => {
      const authorId = placeToAuthor.get(v.place_id);
      if (!authorId) return;

      const existing = authorStats.get(authorId);
      if (existing) {
        existing.visitCount++;
        existing.placeIds.add(v.place_id);
      } else {
        authorStats.set(authorId, { placeIds: new Set([v.place_id]), visitCount: 1 });
      }
    });

    // include authors with places but no visits
    places.forEach((p: any) => {
      const authorId = p.author_user_id;
      if (!authorStats.has(authorId)) {
        authorStats.set(authorId, { placeIds: new Set([p.id]), visitCount: 0 });
      } else {
        authorStats.get(authorId)!.placeIds.add(p.id);
      }
    });

    return Array.from(authorStats.entries())
      .map(([userId, stats]) => ({
        user_id: userId,
        place_count: stats.placeIds.size,
        total_visits: stats.visitCount,
      }))
      .sort((a, b) => b.total_visits - a.total_visits || b.place_count - a.place_count)
      .slice(0, limit);
  } catch (error) {
    console.error("getTopAuthorsFallback error:", error);
    return [];
  }
}

/* -----------------------------
   THUMBNAILS (bez created_at)
------------------------------ */

async function addThumbnailsToPlaces(places: TopPlace[]): Promise<TopPlace[]> {
  if (places.length === 0) return [];

  try {
    const supabase = await getSupabaseServerClient();
    const placeIds = places.map((p) => p.place_id);

    // Neřadíme podle created_at (může chybět). Vezmeme prostě první nalezenou fotku.
    const { data: media, error } = await supabase
      .from("place_media")
      .select("place_id, storage_path")
      .in("place_id", placeIds)
      .eq("media_type", "photo");

    if (error || !media) {
      console.error("Media query error:", error);
      return places;
    }

    const placeToPhoto = new Map<string, string>();
    media.forEach((m: any) => {
      if (!placeToPhoto.has(m.place_id)) {
        placeToPhoto.set(m.place_id, m.storage_path);
      }
    });

    return places.map((place) => {
      const storagePath = placeToPhoto.get(place.place_id);
      if (!storagePath) return place;

      const { data: urlData } = supabase.storage
        .from("place-media")
        .getPublicUrl(storagePath);

      return { ...place, thumbnail_url: urlData.publicUrl };
    });
  } catch (error) {
    console.error("addThumbnailsToPlaces error:", error);
    return places;
  }
}