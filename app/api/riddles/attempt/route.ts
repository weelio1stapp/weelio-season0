import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serverClient";

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
      .select("id, answer_type, answer_plain, xp_reward, max_attempts, is_active")
      .eq("id", riddle_id)
      .maybeSingle();

    if (riddleError || !riddle) {
      console.error("Riddle load error:", riddleError);
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

    const maxAttempts = riddle.max_attempts ?? 3;

    // 4️⃣ Count attempts_used for this user + riddle (BEFORE new attempt)
    const { count: attemptsUsed, error: countError } = await supabase
      .from("place_riddle_attempts")
      .select("id", { count: "exact", head: true })
      .eq("riddle_id", riddle.id)
      .eq("user_id", user.id);

    if (countError) {
      console.error("Count attempts error:", {
        code: countError.code,
        message: countError.message,
        details: (countError as any).details,
        hint: (countError as any).hint,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Nepodařilo se spočítat pokusy",
          details: countError.message,
        },
        { status: 500 }
      );
    }

    const attemptsUsedCount = attemptsUsed ?? 0;

    // 5️⃣ Check if out of attempts (BEFORE new attempt)
    if (attemptsUsedCount >= maxAttempts) {
      return NextResponse.json({
        ok: true,
        correct: false,
        xp_delta: 0,
        attempts_left: 0,
        max_attempts: maxAttempts,
        error: "Došly pokusy",
      });
    }

    // 6️⃣ Check if already solved (for XP award logic only, NOT for blocking attempts)
    const { data: solvedAttempt, error: solvedError } = await supabase
      .from("place_riddle_attempts")
      .select("id")
      .eq("riddle_id", riddle.id)
      .eq("user_id", user.id)
      .eq("is_correct", true)
      .maybeSingle();

    if (solvedError) {
      console.error("Solved check error:", {
        code: solvedError.code,
        message: solvedError.message,
        details: (solvedError as any).details,
        hint: (solvedError as any).hint,
      });
    }

    const alreadySolved = !!solvedAttempt;

    // 7️⃣ Verify answer (ALWAYS evaluate, regardless of solved state)
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

    // 8️⃣ Log attempt
    const { error: insertError } = await supabase
      .from("place_riddle_attempts")
      .insert({
        riddle_id: riddle.id,
        user_id: user.id,
        answer_plain: String(answer_plain),
        is_correct: correct,
      });

    if (insertError) {
      console.error("Insert attempt error:", {
        code: insertError.code,
        message: insertError.message,
        details: (insertError as any).details,
        hint: (insertError as any).hint,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Nepodařilo se zapsat pokus",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    // 9️⃣ Calculate attempts_left AFTER inserting the new attempt
    const newAttemptsUsed = attemptsUsedCount + 1;
    const attemptsLeft = Math.max(0, maxAttempts - newAttemptsUsed);

    // Calculate XP (only on FIRST correct attempt)
    const xpDelta = correct && !alreadySolved ? (riddle.xp_reward ?? 0) : 0;

    return NextResponse.json({
      ok: true,
      correct,
      already_solved: alreadySolved,
      xp_delta: xpDelta,
      attempts_left: attemptsLeft,
      max_attempts: maxAttempts,
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
