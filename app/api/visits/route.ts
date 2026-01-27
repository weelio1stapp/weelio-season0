import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

type Body = { placeId: string; source?: string };

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();

  // Auth check (must be real user, not anon)
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    console.error("auth.getUser error:", { message: userErr.message });
  }

  const user = userData?.user;
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
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

  // ✅ NEW: Visit + XP + Streak in ONE DB call (atomic)
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "record_visit_and_progress",
    {
      p_place_id: placeId,
      p_source: source,
    }
  );

  if (rpcError) {
    console.error("record_visit_and_progress RPC error:", {
      code: rpcError.code,
      message: rpcError.message,
      details: rpcError.details,
      hint: rpcError.hint,
    });

    return NextResponse.json(
      { ok: false, error: "record_visit_and_progress failed" },
      { status: 500 }
    );
  }

  // Supabase can return TABLE rows as array
  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;

  return NextResponse.json({
    ok: true,
    xp_delta: row?.xp_delta ?? 0,
    xp_total: row?.xp_total ?? 0,
    streak_weeks: row?.streak_weeks ?? 0,
    best_streak_weeks: row?.best_streak_weeks ?? 0,
  });
}