import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // Parse JSON body
    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      place_id,
      prompt,
      answer_type,
      answer_plain,
      xp_reward = 15,
    } = body;

    // Validate inputs
    if (!place_id || typeof place_id !== "string") {
      return NextResponse.json(
        { ok: false, error: "place_id is required" },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json(
        { ok: false, error: "prompt is required" },
        { status: 400 }
      );
    }

    if (!answer_type || !["text", "number"].includes(answer_type)) {
      return NextResponse.json(
        { ok: false, error: "answer_type must be 'text' or 'number'" },
        { status: 400 }
      );
    }

    if (
      !answer_plain ||
      typeof answer_plain !== "string" ||
      answer_plain.trim() === ""
    ) {
      return NextResponse.json(
        { ok: false, error: "answer_plain is required" },
        { status: 400 }
      );
    }

    if (typeof xp_reward !== "number" || xp_reward < 1 || xp_reward > 100) {
      return NextResponse.json(
        { ok: false, error: "xp_reward must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Check authentication
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Musíte být přihlášeni" },
        { status: 401 }
      );
    }

    // Call RPC function to create riddle
    const { data, error: rpcError } = await supabase.rpc(
      "create_place_riddle",
      {
        p_place_id: place_id,
        p_prompt: prompt.trim(),
        p_answer_type: answer_type,
        p_answer_plain: answer_plain,
        p_xp_reward: xp_reward,
      }
    );

    if (rpcError) {
      console.error("create_place_riddle RPC error:", {
        code: rpcError.code,
        message: rpcError.message,
        details: (rpcError as any).details,
        hint: (rpcError as any).hint,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Nepodařilo se vytvořit kešku",
          details: rpcError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, riddle_id: data });
  } catch (error: any) {
    console.error("Riddle create exception:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Došlo k neočekávané chybě",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
