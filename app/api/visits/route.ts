import { NextRequest, NextResponse } from "next/server";
import { markVisited, type VisitSource } from "@/lib/db/visits";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

type RequestBody = {
  placeId: string;
  source?: VisitSource;
};

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    if (!body.placeId) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: "placeId je povinné pole" },
        { status: 400 }
      );
    }

    const source = body.source || "button";

    // Validate source
    if (source !== "button" && source !== "qr") {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: "source musí být 'button' nebo 'qr'" },
        { status: 400 }
      );
    }

    const result = await markVisited(body.placeId, source);

    // Handle unauthorized
    if (result.isUnauthorized) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Handle duplicate (already visited today)
    if (result.isDuplicate) {
      return NextResponse.json(
        { ok: false, code: "ALREADY_VISITED_TODAY" },
        { status: 409 }
      );
    }

    // Handle other errors
    if (!result.success) {
      console.error("markVisited failed:", {
        error: result.error,
      });
      return NextResponse.json(
        { ok: false, code: "UNKNOWN", error: result.error },
        { status: 500 }
      );
    }

    // Success - apply XP and streak
    let xpData = null;
    try {
      const supabase = await getSupabaseServerClient();
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "apply_visit_xp_and_streak",
        {
          p_place_id: body.placeId,
          p_visit_on: today,
        }
      );

      if (rpcError) {
        console.error("apply_visit_xp_and_streak error:", {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
        });
      } else if (rpcData && rpcData.length > 0) {
        xpData = rpcData[0];
      }
    } catch (xpError) {
      console.error("XP/streak calculation error:", xpError);
      // Don't fail the request if XP calculation fails
    }

    // Revalidate relevant paths
    try {
      revalidatePath("/leaderboard");
      revalidatePath("/me");
      revalidatePath(`/p/${body.placeId}`);
    } catch (revalidateError) {
      console.error("Revalidation error:", revalidateError);
      // Don't fail the request if revalidation fails
    }

    return NextResponse.json({
      ok: true,
      xp_delta: xpData?.xp_delta ?? 0,
      xp_total: xpData?.xp_total ?? 0,
      streak_weeks: xpData?.streak_weeks ?? 0,
      best_streak_weeks: xpData?.best_streak_weeks ?? 0,
    });
  } catch (error) {
    console.error("POST /api/visits error:", error);
    return NextResponse.json(
      { ok: false, code: "UNKNOWN", error: "Interní chyba serveru" },
      { status: 500 }
    );
  }
}
