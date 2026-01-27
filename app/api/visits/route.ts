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

  return NextResponse.json({
    ok: true,
    xp_delta: row?.xp_delta ?? 0,
    xp_total: row?.xp_total ?? 0,
    streak_weeks: row?.streak_weeks ?? 0,
    best_streak_weeks: row?.best_streak_weeks ?? 0,
  });
}