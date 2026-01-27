import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

type Body = { placeId: string; source?: string };

async function getCurrentUserProgress(supabase: any) {
  // Ensure row exists (ignore errors, but log)
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

  // Auth check (must be real user, not anon)
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    console.error("auth.getUser error:", {
      message: userErr.message,
    });
  }

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

  // 1) Insert visit (unique constraint should prevent duplicates today)
  const { error: insertErr } = await supabase.from("place_visits").insert({
    place_id: placeId,
    user_id: user.id,
    source,
  });

  // Duplicate visit today -> return current progress (no xp delta)
  if (insertErr?.code === "23505") {
    const cur = await getCurrentUserProgress(supabase);
    return NextResponse.json({
      ok: true,
      xp_delta: 0,
      xp_total: cur.xp,
      streak_weeks: cur.streak_weeks,
      best_streak_weeks: cur.best_streak_weeks,
      info: "Already visited today",
    });
  }

  if (insertErr) {
    console.error("place_visits insert error:", {
      code: insertErr.code,
      message: insertErr.message,
      details: insertErr.details,
      hint: insertErr.hint,
    });
    return NextResponse.json({ ok: false, error: "Insert visit failed" }, { status: 500 });
  }

  // 2) Apply XP & streak via RPC (use visited_on date)
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: xpData, error: xpErr } = await supabase.rpc("apply_visit_xp_and_streak", {
    p_place_id: placeId,
    p_visit_on: today,
  });

  if (xpErr) {
    console.error("apply_visit_xp_and_streak error:", {
      code: xpErr.code,
      message: xpErr.message,
      details: xpErr.details,
      hint: xpErr.hint,
    });

    const cur = await getCurrentUserProgress(supabase);
    return NextResponse.json({
      ok: true,
      xp_delta: 0,
      xp_total: cur.xp,
      streak_weeks: cur.streak_weeks,
      best_streak_weeks: cur.best_streak_weeks,
      warning: "XP calculation failed, showing current state",
    });
  }

  // Supabase can return TABLE rows as array
  const row = Array.isArray(xpData) ? xpData[0] : xpData;

  return NextResponse.json({
    ok: true,
    xp_delta: row?.xp_delta ?? 0,
    xp_total: row?.xp_total ?? 0,
    streak_weeks: row?.streak_weeks ?? 0,
    best_streak_weeks: row?.best_streak_weeks ?? 0,
  });
}