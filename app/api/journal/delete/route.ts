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

    const { id } = body;

    // Validate id
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { ok: false, error: "ID is required" },
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

    // Delete journal entry (only if owned by user)
    const { error: deleteError } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Journal delete error:", {
        code: deleteError.code,
        message: deleteError.message,
        details: (deleteError as any).details,
        hint: (deleteError as any).hint,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Nepodařilo se smazat záznam",
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Journal delete exception:", error);
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
