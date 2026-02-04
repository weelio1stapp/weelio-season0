import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serverClient";

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
    const body = await req.json();
    const { place_id, prompt, answer_type, answer_plain, xp_reward, max_attempts } = body;

    if (
      !place_id ||
      !prompt ||
      !answer_type ||
      answer_plain === undefined ||
      xp_reward === undefined ||
      max_attempts === undefined
    ) {
      return NextResponse.json(
        { ok: false, error: "Neplatná data" },
        { status: 400 }
      );
    }

    // Validate max_attempts (1-4)
    const maxAttemptsNum = Number(max_attempts);
    if (!Number.isInteger(maxAttemptsNum) || maxAttemptsNum < 1 || maxAttemptsNum > 4) {
      return NextResponse.json(
        { ok: false, error: "max_attempts musí být číslo 1-4" },
        { status: 400 }
      );
    }

    // 3️⃣ INSERT
    const { data, error } = await supabase
      .from("place_riddles")
      .insert({
        place_id,
        prompt,
        answer_type,
        answer_plain,
        xp_reward,
        max_attempts: maxAttemptsNum,
        is_active: true,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Riddle insert error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Nepodařilo se vytvořit kešku",
          details: error.message,
        },
        { status: 500 }
      );
    }

    // 4️⃣ Success
    return NextResponse.json({
      ok: true,
      id: data.id,
    });
  } catch (err: any) {
    console.error("Riddle create fatal error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "Nepodařilo se vytvořit kešku",
        details: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}