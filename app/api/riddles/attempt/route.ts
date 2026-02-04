import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serverClient";

const MAX_DAILY_ATTEMPTS = 5;

function normalizeText(s: string) {
  return (s ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();

    // 1️⃣ Auth
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

    // 2️⃣ Body
    const body = await req.json().catch(() => null);
    const riddle_id =
      body && typeof body.riddle_id === "string" ? body.riddle_id : null;
    const answer_plain = body?.answer_plain;

    if (!riddle_id || answer_plain === undefined) {
      return NextResponse.json(
        { ok: false, error: "Neplatná data" },
        { status: 400 }
      );
    }

    // 3️⃣ Load riddle
    const { data: riddle, error: riddleError } = await supabase
      .from("place_riddles")
      .select("id, answer_type, answer_plain, xp_reward, is_active")
      .eq("id", riddle_id)
      .maybeSingle();

    if (riddleError || !riddle) {
      return NextResponse.json(
        { ok: false, error: "Keška nenalezena" },
        { status: 404 }
      );
    }

    if (riddle.is_active === false) {
      return NextResponse.json(
        { ok: false, error: "Keška je neaktivní" },
        { status: 400 }
      );
    }

    // 4️⃣ Count attempts today
    const today = new Date().toISOString().slice(0, 10);

    const { count } = await supabase
      .from("place_riddle_attempts")
      .select("id", { count: "exact", head: true })
      .eq("riddle_id", riddle.id)
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`);

    const attemptsUsed = count ?? 0;
    const remainingAttempts = Math.max(
      0,
      MAX_DAILY_ATTEMPTS - attemptsUsed
    );

    if (remainingAttempts <= 0) {
      return NextResponse.json({
        ok: true,
        correct: false,
        xp_awarded: 0,
        remaining_attempts: 0,
      });
    }

    // 5️⃣ Verify answer
    let correct = false;

    if (riddle.answer_type === "number") {
      const expected = Number(String(riddle.answer_plain).trim());
      const got = Number(String(answer_plain).trim());
      correct =
        Number.isFinite(expected) &&
        Number.isFinite(got) &&
        expected === got;
    } else {
      correct =
        normalizeText(String(riddle.answer_plain)) ===
        normalizeText(String(answer_plain));
    }

    // 6️⃣ Log attempt
    await supabase.from("place_riddle_attempts").insert({
      riddle_id: riddle.id,
      user_id: user.id,
      answer_plain: String(answer_plain),
      is_correct: correct,
    });

    const xpAwarded = correct ? riddle.xp_reward ?? 0 : 0;

    return NextResponse.json({
      ok: true,
      correct,
      xp_awarded: xpAwarded,
      remaining_attempts: remainingAttempts - 1,
    });
  } catch (err: any) {
    console.error("Riddle attempt fatal error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "Nepodařilo se ověřit odpověď",
        details: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}