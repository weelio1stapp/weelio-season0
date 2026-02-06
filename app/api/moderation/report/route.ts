import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export const runtime = "nodejs";

/**
 * POST /api/moderation/report
 * Create a moderation report for inappropriate content
 */
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

    const { target_type, target_id, reason } = body;

    // Validate required fields
    if (!target_type || typeof target_type !== "string") {
      return NextResponse.json(
        { ok: false, error: "target_type is required" },
        { status: 400 }
      );
    }

    if (!target_id || typeof target_id !== "string") {
      return NextResponse.json(
        { ok: false, error: "target_id is required" },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        { ok: false, error: "reason is required" },
        { status: 400 }
      );
    }

    // Validate target_type
    const validTypes = ["place_photo", "place_media", "journal_entry", "riddle"];
    if (!validTypes.includes(target_type)) {
      return NextResponse.json(
        { ok: false, error: `Invalid target_type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate reason length
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      return NextResponse.json(
        { ok: false, error: "Důvod musí mít alespoň 5 znaků" },
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

    // Insert report (RLS will enforce reporter_user_id = auth.uid())
    const { data, error: insertError } = await supabase
      .from("moderation_reports")
      .insert({
        reporter_user_id: user.id,
        target_type,
        target_id,
        reason: trimmedReason,
        status: "open",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Moderation report insert error:", {
        code: insertError.code,
        message: insertError.message,
        details: (insertError as any).details,
        hint: (insertError as any).hint,
      });

      // Check for duplicate report constraint
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            ok: false,
            error: "Tento obsah jsi už nahlásil",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Nepodařilo se vytvořit report",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, report: data });
  } catch (error: any) {
    console.error("Moderation report exception:", error);
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
