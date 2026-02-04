import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export const runtime = "nodejs";

const MAX_DAILY_RIDDLE_ATTEMPTS = 5;

export async function GET(req: Request) {
  try {
    // Parse query params
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get("placeId");

    // Validate placeId
    if (!placeId || typeof placeId !== "string") {
      return NextResponse.json(
        { ok: false, error: "placeId is required" },
        { status: 400 }
      );
    }

    // Check authentication
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Musíte být přihlášeni" },
        { status: 401 }
      );
    }

    // Get all riddles for this place
    const { data: riddles, error: riddlesError } = await supabase
      .from("place_riddles")
      .select("id")
      .eq("place_id", placeId)
      .eq("is_active", true);

    if (riddlesError) {
      console.error("Error fetching riddles:", {
        code: riddlesError.code,
        message: riddlesError.message,
        details: (riddlesError as any).details,
        hint: (riddlesError as any).hint,
      });
      return NextResponse.json(
        { ok: false, error: "Nepodařilo se načíst kešky", details: riddlesError.message },
        { status: 500 }
      );
    }

    // If no riddles, return max attempts
    if (!riddles || riddles.length === 0) {
      return NextResponse.json({
        ok: true,
        remaining: MAX_DAILY_RIDDLE_ATTEMPTS,
        limit: MAX_DAILY_RIDDLE_ATTEMPTS,
      });
    }

    const riddleIds = riddles.map((r) => r.id);

    // Count attempts today for these riddles
    // Each row in riddle_attempts represents attempts on one riddle on one day
    // We count the number of distinct riddles attempted today
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { data: attempts, error: attemptsError } = await supabase
      .from("riddle_attempts")
      .select("riddle_id")
      .eq("user_id", user.id)
      .in("riddle_id", riddleIds)
      .eq("attempted_on", today);

    if (attemptsError) {
      console.error("Error fetching attempts:", {
        code: attemptsError.code,
        message: attemptsError.message,
        details: (attemptsError as any).details,
        hint: (attemptsError as any).hint,
      });
      return NextResponse.json(
        { ok: false, error: "Nepodařilo se načíst pokusy", details: attemptsError.message },
        { status: 500 }
      );
    }

    // Count distinct riddles attempted today
    const attemptedRiddlesCount = attempts ? attempts.length : 0;

    // Calculate remaining
    const remaining = Math.max(0, MAX_DAILY_RIDDLE_ATTEMPTS - attemptedRiddlesCount);

    return NextResponse.json({
      ok: true,
      remaining,
      limit: MAX_DAILY_RIDDLE_ATTEMPTS,
    });
  } catch (error: any) {
    console.error("Riddle status exception:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Došlo k neočekávané chybě",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
