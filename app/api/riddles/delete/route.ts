import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serverClient";

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();

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

    const body = await req.json();
    const { riddle_id } = body ?? {};

    if (!riddle_id) {
      return NextResponse.json(
        { ok: false, error: "Neplatná data" },
        { status: 400 }
      );
    }

    // jen autor může mazat
    const { data: riddle, error: riddleError } = await supabase
      .from("place_riddles")
      .select("id, created_by")
      .eq("id", riddle_id)
      .single();

    if (riddleError) {
      console.error("Riddle fetch error:", {
        code: riddleError.code,
        message: riddleError.message,
        details: (riddleError as any).details,
        hint: (riddleError as any).hint,
      });
      return NextResponse.json(
        { ok: false, error: "Keška nenalezena", details: riddleError.message },
        { status: 404 }
      );
    }

    if (!riddle) {
      return NextResponse.json(
        { ok: false, error: "Keška nenalezena" },
        { status: 404 }
      );
    }

    if (riddle.created_by !== user.id) {
      return NextResponse.json(
        { ok: false, error: "Nemáš oprávnění smazat tuto kešku" },
        { status: 403 }
      );
    }

    // Soft delete: set is_active = false
    const { error: delError } = await supabase
      .from("place_riddles")
      .update({ is_active: false })
      .eq("id", riddle_id);

    if (delError) {
      console.error("Riddle soft delete error:", {
        code: delError.code,
        message: delError.message,
        details: (delError as any).details,
        hint: (delError as any).hint,
      });
      return NextResponse.json(
        { ok: false, error: "Nepodařilo se smazat kešku", details: delError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Riddle delete fatal error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Nepodařilo se smazat kešku",
        details: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}