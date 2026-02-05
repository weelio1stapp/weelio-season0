import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

/**
 * Decode cursor from base64 JSON or handle legacy format
 */
function decodeCursor(cursorParam: string): { created_at: string; id: string } | null {
  try {
    // Try to decode as base64 JSON
    const decoded = Buffer.from(cursorParam, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);

    if (parsed.created_at && parsed.id) {
      return { created_at: parsed.created_at, id: parsed.id };
    }

    // Fallback: treat as plain ISO timestamp (backward compatibility)
    return { created_at: cursorParam, id: "" };
  } catch {
    // Invalid cursor, ignore
    return null;
  }
}

/**
 * Encode cursor to base64 JSON
 */
function encodeCursor(created_at: string, id: string): string {
  const obj = { created_at, id };
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

export async function GET(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();

    // 1️⃣ Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Nepřihlášený uživatel" },
        { status: 401 }
      );
    }

    // 2️⃣ Parse query params
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const cursorParam = searchParams.get("cursor");
    const sourceParam = searchParams.get("source");

    const limit = Math.min(
      parseInt(limitParam || "20", 10),
      50
    );

    // 3️⃣ Build base query
    let query = supabase
      .from("user_xp_events")
      .select("id, source, source_id, xp_delta, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there's more

    // Apply source filter
    if (sourceParam && sourceParam !== "all") {
      query = query.eq("source", sourceParam);
    }

    // Apply cursor pagination (using tuple: created_at, id)
    if (cursorParam) {
      const cursor = decodeCursor(cursorParam);

      if (cursor) {
        if (cursor.id) {
          // Full tuple cursor: (created_at < c) OR (created_at = c AND id < c.id)
          query = query.or(
            `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
          );
        } else {
          // Legacy cursor (created_at only)
          query = query.lt("created_at", cursor.created_at);
        }
      }
    }

    const { data: events, error } = await query;

    if (error) {
      console.error("Fetch XP events error:", {
        code: error.code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
      });
      return NextResponse.json(
        { ok: false, error: "Nepodařilo se načíst XP historii" },
        { status: 500 }
      );
    }

    // 4️⃣ Handle pagination
    const hasMore = events && events.length > limit;
    const resultEvents = hasMore ? events.slice(0, limit) : events || [];

    // Encode next_cursor as tuple (created_at, id)
    const nextCursor = hasMore && resultEvents.length > 0
      ? encodeCursor(
          resultEvents[resultEvents.length - 1].created_at,
          resultEvents[resultEvents.length - 1].id
        )
      : null;

    return NextResponse.json({
      ok: true,
      events: resultEvents,
      next_cursor: nextCursor,
    });
  } catch (err: any) {
    console.error("XP events API fatal error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Nepodařilo se načíst XP historii",
        details: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
