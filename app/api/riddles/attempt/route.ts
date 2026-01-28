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

    const { riddle_id, answer_plain } = body;

    // Validate inputs
    if (!riddle_id || typeof riddle_id !== "string") {
      return NextResponse.json(
        { ok: false, error: "riddle_id is required" },
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

    // Call RPC function to attempt riddle
    const { data, error: rpcError } = await supabase.rpc("attempt_riddle", {
      p_riddle_id: riddle_id,
      p_answer_plain: answer_plain,
    });

    if (rpcError) {
      console.error("attempt_riddle RPC error:", {
        code: rpcError.code,
        message: rpcError.message,
        details: (rpcError as any).details,
        hint: (rpcError as any).hint,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Nepodařilo se ověřit odpověď",
          details: rpcError.message,
        },
        { status: 500 }
      );
    }

    // RPC returns array with single result
    const result = data && data.length > 0 ? data[0] : null;

    if (!result || !result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result?.error_message || "Neplatná odpověď",
        },
        { status: 400 }
      );
    }

    // Success response
    return NextResponse.json({
      ok: true,
      correct: result.correct,
      already_solved: result.already_solved || false,
      xp_delta: result.xp_delta || 0,
      attempts_left: result.attempts_left || 0,
    });
  } catch (error: any) {
    console.error("Riddle attempt exception:", error);
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
