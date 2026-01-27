import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

type Body = { placeId: string; source?: string };

async function getCurrentUserProgress(supabase: any) {
  const { error: ensureErr } = await supabase.rpc("ensure_user_progress");
  if (ensureErr) {
    console.error("ensure_user_progress error:", {
      code: ensureErr.code,
      message: ensureErr.message,
      details: ensureErr.details,
      hint: ensureErr.hint,
    });
  }

  const { data, error } = await supabase
    .from("user_progress")
    .select("xp, streak_weeks, best_streak_weeks")
    .single();

  if (error) {
    console.error("user_progress select error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { xp: 0, streak_weeks: 0, best_streak_weeks: 0 };
  }

  return {
    xp: data?.xp ?? 0,
    streak_weeks: data?.streak_weeks ?? 0,
    best_streak_weeks: data?.best_streak_weeks ?? 0,
  };
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const placeId = body.placeId;
  const source = body.source ?? "button";

  if (!placeId) {
    return NextResponse.json({ ok: false, error: "Missing placeId" }, { status: 400 });
  }

  // ✅ 1) Primárně zkusíme atomickou RPC funkci (visit + XP + streak)
  const { data: rpcData, error: rpcError } = await supabase.rpc("record_visit_and_progress", {
    p_place_id: placeId,
    p_source: source,
  });

  if (rpcError) {
    console.error("record_visit_and_progress RPC error:", rpcError);

    // Vrátíme detail pro debug (aby bylo jasné, jestli je to arg names / grant / RLS / signatura)
    const cur = await getCurrentUserProgress(supabase);

    return NextResponse.json(
      {
        ok: false,
        error: "record_visit_and_progress failed",
        rpc: {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
        },
        current: {
          xp_total: cur.xp,
          streak_weeks: cur.streak_weeks,
          best_streak_weeks: cur.best_streak_weeks,
        },
      },
      { status: 500 }
    );
  }

  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;

  return NextResponse.json({
    ok: true,
    xp_delta: row?.xp_delta ?? 0,
    xp_total: row?.xp_total ?? 0,
    streak_weeks: row?.streak_weeks ?? 0,
    best_streak_weeks: row?.best_streak_weeks ?? 0,
  });
}