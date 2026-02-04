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
    const { riddle_id } = body;

    if (!riddle_id) {
      return NextResponse.json(
        { ok: false, error: "Neplatná data" },
        { status: 400 }
      );
    }

    // Zajisti, že mazat může jen autor kešky (nebo admin – pokud máš roli)
    const { data: riddle, error: riddleError } = await supabase
      .from("place_riddles")
      .select("id, created_by")
      .eq("id", riddle_id)
      .single();

    if (riddleError || !riddle) {
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

    const { error } = await supabase
      .from("place_riddles")
      .update({ is_active: false })
      .eq("id", riddle_id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Nepodařilo se smazat kešku", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Riddle delete fatal error:", err);
    return NextResponse.json(
      { ok: false, error: "Nepodařilo se smazat kešku", details: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
