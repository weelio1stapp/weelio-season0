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

    const { id, content, visibility } = body;

    // Validate id
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { ok: false, error: "ID is required" },
        { status: 400 }
      );
    }

    // Validate content
    if (typeof content !== "string" || content.trim() === "") {
      return NextResponse.json(
        { ok: false, error: "Content is required and cannot be empty" },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length > 2000) {
      return NextResponse.json(
        { ok: false, error: "Content is too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    // Validate visibility
    if (visibility !== "private" && visibility !== "public") {
      return NextResponse.json(
        { ok: false, error: "Visibility must be 'private' or 'public'" },
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

    // Update journal entry (only if owned by user)
    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({
        content: trimmedContent,
        visibility,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Journal update error:", {
        code: updateError.code,
        message: updateError.message,
        details: (updateError as any).details,
        hint: (updateError as any).hint,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Nepodařilo se aktualizovat záznam",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Journal update exception:", error);
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
