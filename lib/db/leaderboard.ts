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

function shouldFallbackToManualQuery(rpcError: any) {
  // 42883 = function does not exist
  // 22023 / 22P02 / 42601 apod. často u RPC znamená špatné parametry / typy
  const code = rpcError?.code;
  const msg = (rpcError?.message || "").toLowerCase();
  return (
    code === "42883" ||
    msg.includes("function") && msg.includes("does not exist") ||
    msg.includes("argument") ||
    msg.includes("parameter") ||
    msg.includes("invalid input") ||
    msg.includes("cannot cast")
  );
}

export async function getTopPlaces(
  limit = 10,
  days: number | null = null
): Promise<TopPlace[]> {
  try {
    const supabase = await getSupabaseServerClient();

    // IMPORTANT: param names must match function args in Postgres (limit_n, days)
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_top_places", {
      limit_n: limit,
      days,
    });

    if (rpcError && shouldFallbackToManualQuery(rpcError)) {
      return await getTopPlacesFallback(limit, days);
    }

    if (rpcError) {
      console.error("RPC error:", {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      });
      return [];
    }

    return rpcData || [];
  } catch (error) {
    console.error("getTopPlaces error:", error);
    return [];
  }
}

async function getTopPlacesFallback(
  limit: number,
  days: number | null
): Promise<TopPlace[]> {
  try {
    const supabase = await getSupabaseServerClient();

    let dateFilter = "";
    if (days !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      dateFilter = cutoffDate.toISOString();
    }

    let query = supabase
      .from("place_visits")
      .select(
        `
        place_id,
        places!inner(name, area, type)
      `
      );

    if (dateFilter) {
      query = query.gte("visited_at", dateFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Fallback query error:", error);
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

export async function getTopWalkers(
  limit = 10,
  days: number | null = null
): Promise<TopWalker[]> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc("get_top_walkers", {
      limit_n: limit,
      days,
    });

    if (rpcError && shouldFallbackToManualQuery(rpcError)) {
      return await getTopWalkersFallback(limit, days);
    }

    if (rpcError) {
      console.error("RPC error:", {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      });
      return [];
    }

    return rpcData || [];
  } catch (error) {
    console.error("getTopWalkers error:", error);
    return [];
  }
}

async function getTopWalkersFallback(
  limit: number,
  days: number | null
): Promise<TopWalker[]> {
  try {
    const supabase = await getSupabaseServerClient();

    let dateFilter = "";
    if (days !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      dateFilter = cutoffDate.toISOString();
    }

    let query = supabase.from("place_visits").select("user_id, place_id");

    if (dateFilter) {
      query = query.gte("visited_at", dateFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Fallback query error:", error);
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

export async function getTopAuthors(
  limit = 10,
  days: number | null = null
): Promise<TopAuthor[]> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc("get_top_authors", {
      limit_n: limit,
      days,
    });

    if (rpcError && shouldFallbackToManualQuery(rpcError)) {
      return await getTopAuthorsFallback(limit, days);
    }

    if (rpcError) {
      console.error("RPC error:", {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      });
      return [];
    }

    return rpcData || [];
  } catch (error) {
    console.error("getTopAuthors error:", error);
    return [];
  }
}

async function getTopAuthorsFallback(
  limit: number,
  days: number | null
): Promise<TopAuthor[]> {
  try {
    const supabase = await getSupabaseServerClient();

    let dateFilter = "";
    if (days !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      dateFilter = cutoffDate.toISOString();
    }

    const { data: places, error: placesError } = await supabase
      .from("places")
      .select("id, author_user_id");

    if (placesError || !places) {
      console.error("Places query error:", placesError);
      return [];
    }

    let visitsQuery = supabase.from("place_visits").select("place_id");

    if (dateFilter) {
      visitsQuery = visitsQuery.gte("visited_at", dateFilter);
    }

    const { data: visits, error: visitsError } = await visitsQuery;

    if (visitsError) {
      console.error("Visits query error:", visitsError);
      return [];
    }

    const placeToAuthor = new Map<string, string>();
    places.forEach((place) => {
      placeToAuthor.set(place.id, place.author_user_id);
    });

    const authorStats = new Map<
      string,
      { placeIds: Set<string>; visitCount: number }
    >();

    visits?.forEach((visit: any) => {
      const authorId = placeToAuthor.get(visit.place_id);
      if (!authorId) return;

      const existing = authorStats.get(authorId);
      if (existing) {
        existing.visitCount++;
        existing.placeIds.add(visit.place_id);
      } else {
        authorStats.set(authorId, {
          placeIds: new Set([visit.place_id]),
          visitCount: 1,
        });
      }
    });

    places.forEach((place) => {
      const authorId = place.author_user_id;
      if (!authorStats.has(authorId)) {
        authorStats.set(authorId, {
          placeIds: new Set([place.id]),
          visitCount: 0,
        });
      }
    });

    return Array.from(authorStats.entries())
      .map(([userId, stats]) => ({
        user_id: userId,
        place_count: stats.placeIds.size,
        total_visits: stats.visitCount,
      }))
      .sort((a, b) => {
        if (b.total_visits !== a.total_visits) return b.total_visits - a.total_visits;
        return b.place_count - a.place_count;
      })
      .slice(0, limit);
  } catch (error) {
    console.error("getTopAuthorsFallback error:", error);
    return [];
  }
}

async function addThumbnailsToPlaces(places: TopPlace[]): Promise<TopPlace[]> {
  if (places.length === 0) return [];

  try {
    const supabase = await getSupabaseServerClient();
    const placeIds = places.map((p) => p.place_id);

    const { data: media, error } = await supabase
      .from("place_media")
      .select("place_id, storage_path")
      .in("place_id", placeIds)
      .eq("media_type", "photo")
      .order("created_at", { ascending: true });

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

      return {
        ...place,
        thumbnail_url: urlData.publicUrl,
      };
    });
  } catch (error) {
    console.error("addThumbnailsToPlaces error:", error);
    return places;
  }
}