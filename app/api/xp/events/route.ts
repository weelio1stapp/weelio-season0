import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

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

    // 3️⃣ Build query
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

    // Apply cursor pagination (using created_at)
    if (cursorParam) {
      query = query.lt("created_at", cursorParam);
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
    const nextCursor = hasMore && resultEvents.length > 0
      ? resultEvents[resultEvents.length - 1].created_at
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
