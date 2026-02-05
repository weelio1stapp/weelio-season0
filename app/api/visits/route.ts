import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

type Body = {
  placeId: string;
  source?: string;
};

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();

  /* 1️⃣ AUTH – musí existovat přihlášený uživatel */
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData?.user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const userId = userData.user.id;

  /* 2️⃣ BODY */
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const placeId = body.placeId;
  const source = body.source ?? "button";

  if (!placeId) {
    return NextResponse.json(
      { ok: false, error: "Missing placeId" },
      { status: 400 }
    );
  }

  /* 3️⃣ JEDINÝ ZDROJ PRAVDY – RPC */
  const { data, error } = await supabase.rpc(
    "record_visit_and_progress",
    {
      p_place_id: placeId,
      p_user_id: userId,
      p_source: source,
    }
  );

  if (error) {
    console.error("record_visit_and_progress error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "record_visit_and_progress failed",
        rpc: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: 500 }
    );
  }

  /* 4️⃣ RPC vrací 1 řádek (TABLE) */
  const row = Array.isArray(data) ? data[0] : data;

  /* 5️⃣ Award XP using new award_xp system (idempotent per day) */
  const visitDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const dailyBucketKey = `${placeId}:${visitDate}`;
  const VISIT_XP = 5; // XP per visit (once per place per day)

  let xpAwarded = 0;
  let totalXp = row?.xp_total ?? 0;
  let level = 1;

  try {
    const { data: xpResult, error: xpError } = await supabase
      .rpc("award_xp", {
        p_source: "visit",
        p_source_id: dailyBucketKey,
        p_xp_delta: VISIT_XP,
      })
      .single();

    if (xpError) {
      console.error("Award visit XP error:", {
        code: xpError.code,
        message: xpError.message,
        details: (xpError as any).details,
        hint: (xpError as any).hint,
      });
      // Don't fail the request, just log the error
    } else if (xpResult) {
      const result = xpResult as { awarded: boolean; xp_delta: number; xp_total: number; level: number };
      xpAwarded = result.xp_delta || 0;
      totalXp = result.xp_total || 0;
      level = result.level || 1;
    }
  } catch (err) {
    console.error("Award visit XP exception:", err);
  }

  return NextResponse.json({
    ok: true,
    xp_delta: (row?.xp_delta ?? 0) + xpAwarded,
    xp_total: totalXp,
    level: level,
    streak_weeks: row?.streak_weeks ?? 0,
    best_streak_weeks: row?.best_streak_weeks ?? 0,
    visit_xp_awarded: xpAwarded > 0, // Indicates if daily visit XP was awarded
  });
}