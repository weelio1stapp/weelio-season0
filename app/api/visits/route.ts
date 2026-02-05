import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

type Body = {
  placeId: string;
  source?: string;
  note?: string;
  mode?: string; // 'note' | 'photo' | 'audio'
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
  const source = body.source ?? "manual";
  const note = body.note?.trim() || null;
  const mode = body.mode || "button";

  if (!placeId) {
    return NextResponse.json(
      { ok: false, error: "Missing placeId" },
      { status: 400 }
    );
  }

  /* 3️⃣ RECORD VISIT WITH NOTE (using new RPC) */
  const { data: visitData, error: visitError } = await supabase
    .rpc("record_visit_with_note", {
      p_place_id: placeId,
      p_note: note,
    })
    .single();

  if (visitError) {
    console.error("record_visit_with_note error:", visitError);

    return NextResponse.json(
      {
        ok: false,
        error: visitError.message || "Failed to record visit",
        code: visitError.code,
      },
      { status: 500 }
    );
  }

  const visitResult = visitData as {
    visit_id: string;
    journal_entry_id: string | null;
    is_duplicate: boolean;
  };

  // If duplicate visit, don't award XP again
  if (visitResult.is_duplicate) {
    return NextResponse.json({
      ok: true,
      xp_delta: 0,
      xp_total: 0,
      level: 1,
      streak_weeks: 0,
      best_streak_weeks: 0,
      is_duplicate: true,
      message: "Už jsi tu dnes byl",
    });
  }

  /* 4️⃣ Award XP using visit_id for idempotence */
  const VISIT_XP = 10; // Base XP per visit

  let xpAwarded = 0;
  let totalXp = 0;
  let level = 1;

  try {
    const { data: xpResult, error: xpError } = await supabase
      .rpc("award_xp", {
        p_source: "place_visit",
        p_source_id: visitResult.visit_id, // Use visit_id for perfect idempotence
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
      const result = xpResult as {
        awarded: boolean;
        xp_delta: number;
        xp_total: number;
        level: number;
      };
      xpAwarded = result.xp_delta || 0;
      totalXp = result.xp_total || 0;
      level = result.level || 1;
    }
  } catch (err) {
    console.error("Award visit XP exception:", err);
  }

  return NextResponse.json({
    ok: true,
    xp_delta: xpAwarded,
    xp_total: totalXp,
    level: level,
    streak_weeks: 0, // Legacy field for backward compatibility
    best_streak_weeks: 0, // Legacy field for backward compatibility
    visit_id: visitResult.visit_id,
    journal_entry_id: visitResult.journal_entry_id,
  });
}