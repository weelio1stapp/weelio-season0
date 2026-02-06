import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { isAdmin } from "@/lib/auth/admin";

export const runtime = "nodejs";

/**
 * POST /api/admin/moderation/action
 * Take moderation action (hide, delete, dismiss) - Admin only
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

    const { report_id, action } = body;

    // Validate required fields
    if (!report_id || typeof report_id !== "string") {
      return NextResponse.json(
        { ok: false, error: "report_id is required" },
        { status: 400 }
      );
    }

    if (!action || typeof action !== "string") {
      return NextResponse.json(
        { ok: false, error: "action is required" },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ["hide", "delete", "dismiss"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { ok: false, error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
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

    // Check admin status
    if (!isAdmin(user.id)) {
      return NextResponse.json(
        { ok: false, error: "Nemáš oprávnění" },
        { status: 403 }
      );
    }

    // Call RPC function to take action
    const { data, error: rpcError } = await supabase.rpc(
      "take_moderation_action",
      {
        p_report_id: report_id,
        p_action: action,
        p_admin_user_id: user.id,
      }
    );

    if (rpcError) {
      console.error("Take moderation action RPC error:", {
        code: rpcError.code,
        message: rpcError.message,
        details: (rpcError as any).details,
        hint: (rpcError as any).hint,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Nepodařilo se provést akci",
          details: rpcError.message,
        },
        { status: 500 }
      );
    }

    // RPC returns array of rows, take first
    const result = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!result || !result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result?.error_message || "Akce selhala",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Admin moderation action exception:", error);
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
