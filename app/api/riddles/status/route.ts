import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serverClient";

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();

    // Auth (pokud není user, pořád můžeme vrátit seznam kešek; jen některé věci budou null)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json();
    const { place_id } = body ?? {};

    if (!place_id) {
      return NextResponse.json(
        { ok: false, error: "Neplatná data" },
        { status: 400 }
      );
    }

    // 1) Načti kešky pro místo
    // (NEfiltruj is_active – v DB ten sloupec nemáš)
    const { data: riddles, error: riddlesError } = await supabase
      .from("place_riddles")
      .select("id, place_id, prompt, answer_type, xp_reward, created_by, created_at")
      .eq("place_id", place_id)
      .order("created_at", { ascending: false });

    if (riddlesError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Nepodařilo se načíst kešky",
          details: riddlesError.message,
        },
        { status: 500 }
      );
    }

    // 2) Attempts fallback – protože tabulka attempts v projektu zatím není.
    // Vracíme konstanty, aby UI neukazovalo undefined.
    const MAX_ATTEMPTS = 5;

    const enriched = (riddles ?? []).map((r) => {
      const attempts_left = MAX_ATTEMPTS;
      const remaining_attempts = MAX_ATTEMPTS;

      return {
        ...r,

        // pokusy (compat)
        attempts_left,
        remaining_attempts,

        // pro UI tlačítko delete – ať máš jasný boolean
        can_delete: user?.id ? r.created_by === user.id : false,
      };
    });

    return NextResponse.json({
      ok: true,
      place_id,
      riddles: enriched,
      max_attempts: MAX_ATTEMPTS,
    });
  } catch (err: any) {
    console.error("Riddle status fatal error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Nepodařilo se načíst kešky",
        details: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}