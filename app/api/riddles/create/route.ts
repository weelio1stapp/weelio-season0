import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serverClient";

export async function POST(req: Request) {
  try {
    // 1️⃣ Supabase server client
    const supabase = await getSupabaseServerClient();

    // 2️⃣ Auth
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

    // 3️⃣ Request body
    const body = await req.json();
    const {
      place_id,
      prompt,
      answer_type,
      answer_plain,
      xp_reward,
    } = body;

    if (
      !place_id ||
      !prompt ||
      !answer_type ||
      answer_plain === undefined ||
      xp_reward === undefined
    ) {
      return NextResponse.json(
        { ok: false, error: "Neplatná data" },
        { status: 400 }
      );
    }

    // 4️⃣ INSERT (bez RPC)
    const { data, error } = await supabase
      .from("place_riddles")
      .insert({
        place_id,
        prompt,
        answer_type,
        answer_plain,
        xp_reward,
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

    // 5️⃣ Success
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