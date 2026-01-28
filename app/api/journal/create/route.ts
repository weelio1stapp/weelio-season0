import { NextResponse } from "next/server";
import { createJournalEntry } from "@/lib/db/journal";

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

    const { place_id, content, visibility } = body;

    // Validate content
    if (typeof content !== "string" || content.trim() === "") {
      return NextResponse.json(
        { ok: false, error: "Content is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate visibility (default to 'private')
    const validVisibility: "private" | "public" =
      visibility === "public" ? "public" : "private";

    // Create journal entry
    const entry = await createJournalEntry({
      place_id: place_id || null,
      content: content.trim(),
      visibility: validVisibility,
    });

    return NextResponse.json({ ok: true, entry });
  } catch (error: any) {
    console.error("Journal create error:", error);

    // Handle authentication errors
    if (error.message === "Not authenticated") {
      return NextResponse.json(
        { ok: false, error: "Musíte být přihlášeni" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Nepodařilo se vytvořit záznam",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
