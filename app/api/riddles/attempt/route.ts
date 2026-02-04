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
      .select("id, answer_type, answer_plain, xp_reward, max_attempts, cooldown_hours, is_active")
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
    const cooldownHours = riddle.cooldown_hours ?? 24;

    // 4️⃣ Compute window_start for cooldown period
    const now = new Date();
    const windowStart = new Date(now.getTime() - cooldownHours * 60 * 60 * 1000);
    const windowStartISO = windowStart.toISOString();

    // 5️⃣ Load all attempts within the current window
    const { data: windowAttempts, error: attemptsError } = await supabase
      .from("place_riddle_attempts")
      .select("id, is_correct, created_at")
      .eq("riddle_id", riddle.id)
      .eq("user_id", user.id)
      .gte("created_at", windowStartISO)
      .order("created_at", { ascending: false });

    if (attemptsError) {
      console.error("Load window attempts error:", {
        code: attemptsError.code,
        message: attemptsError.message,
        details: (attemptsError as any).details,
        hint: (attemptsError as any).hint,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Nepodařilo se načíst pokusy",
          details: attemptsError.message,
        },
        { status: 500 }
      );
    }

    const attemptsInWindow = windowAttempts || [];
    const attemptsUsedCount = attemptsInWindow.length;

    // 6️⃣ Check if already solved in this window (cooldown active)
    const lastCorrectInWindow = attemptsInWindow.find((a) => a.is_correct);
    const alreadySolved = !!lastCorrectInWindow;

    if (alreadySolved) {
      const nextAvailable = new Date(new Date(lastCorrectInWindow.created_at).getTime() + cooldownHours * 60 * 60 * 1000);
      const attemptsLeft = Math.max(0, maxAttempts - attemptsUsedCount);

      return NextResponse.json({
        ok: true,
        correct: false,
        xp_delta: 0,
        attempts_left: attemptsLeft,
        max_attempts: maxAttempts,
        solved: true,
        next_available_at: nextAvailable.toISOString(),
        error: "Cooldown",
      });
    }

    // 7️⃣ Check if out of attempts (BEFORE new attempt)
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

    // 8️⃣ Verify answer
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

    // 9️⃣ Log attempt
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

    // 🔟 Calculate attempts_left AFTER inserting the new attempt
    const newAttemptsUsed = attemptsUsedCount + 1;
    const attemptsLeft = Math.max(0, maxAttempts - newAttemptsUsed);

    // Calculate XP (only on FIRST correct attempt in window, alreadySolved is false here)
    const xpDelta = correct ? (riddle.xp_reward ?? 0) : 0;

    // Compute next_available_at if this was a correct solve
    let nextAvailableAt: string | null = null;
    if (correct) {
      const nextAvailable = new Date(now.getTime() + cooldownHours * 60 * 60 * 1000);
      nextAvailableAt = nextAvailable.toISOString();
    }

    return NextResponse.json({
      ok: true,
      correct,
      xp_delta: xpDelta,
      attempts_left: attemptsLeft,
      max_attempts: maxAttempts,
      solved: correct,
      next_available_at: nextAvailableAt,
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
