import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serverClient";

function normalizeText(s: string) {
  return (s ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();

    // Auth
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

    // Body
    const body = await req.json();
    const { riddle_id, answer_plain } = body ?? {};

    if (!riddle_id || answer_plain === undefined) {
      return NextResponse.json(
        { ok: false, error: "Neplatná data" },
        { status: 400 }
      );
    }

    // Load riddle
    // Pozn: is_active zatím NEčteme (pokud ho nemáš v DB).
    const { data: riddle, error: riddleError } = await supabase
      .from("place_riddles")
      .select("id, answer_type, answer_plain, xp_reward, created_by")
      .eq("id", riddle_id)
      .maybeSingle();

    if (riddleError || !riddle) {
      return NextResponse.json(
        { ok: false, error: "Keška nenalezena" },
        { status: 404 }
      );
    }

    // Verify
    let correct = false;

    if (riddle.answer_type === "number") {
      const expected = Number(String(riddle.answer_plain).trim());
      const got = Number(String(answer_plain).trim());
      correct =
        Number.isFinite(expected) && Number.isFinite(got) && expected === got;
    } else {
      correct =
        normalizeText(String(riddle.answer_plain)) ===
        normalizeText(String(answer_plain));
    }

    // MVP fallback attempts (protože tabulka attempts nejspíš neexistuje)
    const MAX_ATTEMPTS = 5;
    const attempts_left = correct ? MAX_ATTEMPTS : MAX_ATTEMPTS - 1;

    const xp_delta = correct ? Number(riddle.xp_reward ?? 0) : 0;

    return NextResponse.json({
      ok: true,
      correct,
      xp_delta,          // ✅ FE čeká
      attempts_left,     // ✅ FE čeká

      // compat (když někde starý kód čte tyhle)
      xp_awarded: xp_delta,
      remaining_attempts: attempts_left,
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