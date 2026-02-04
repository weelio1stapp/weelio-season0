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
    const { riddle_id, answer_plain } = body;

    if (!riddle_id || answer_plain === undefined) {
      return NextResponse.json(
        { ok: false, error: "Neplatná data" },
        { status: 400 }
      );
    }

    // Load riddle
    const { data: riddle, error: riddleError } = await supabase
      .from("place_riddles")
      .select("id, answer_type, answer_plain, xp_reward, place_id, created_by, is_active")
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

    // Verify
    let correct = false;

    if (riddle.answer_type === "number") {
      const expected = Number(String(riddle.answer_plain).trim());
      const got = Number(String(answer_plain).trim());
      correct = Number.isFinite(expected) && Number.isFinite(got) && expected === got;
    } else {
      // "text"
      correct = normalizeText(String(riddle.answer_plain)) === normalizeText(String(answer_plain));
    }

    // OPTIONAL: log attempt (pokud nemáš tabulku, přeskoč)
    // Pokud tabulku máš jinak pojmenovanou, řekni název a upravím to.
    // await supabase.from("place_riddle_attempts").insert({
    //   riddle_id: riddle.id,
    //   user_id: user.id,
    //   answer_plain: String(answer_plain),
    //   is_correct: correct,
    // });

    return NextResponse.json({
      ok: true,
      correct,
      xp_reward: correct ? riddle.xp_reward : 0,
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