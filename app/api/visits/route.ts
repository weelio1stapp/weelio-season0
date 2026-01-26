import { NextRequest, NextResponse } from "next/server";
import { markVisited, type VisitSource } from "@/lib/db/visits";

type RequestBody = {
  placeId: string;
  source?: VisitSource;
};

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    if (!body.placeId) {
      return NextResponse.json(
        { ok: false, error: "placeId je povinné pole" },
        { status: 400 }
      );
    }

    const source = body.source || "button";

    // Validate source
    if (source !== "button" && source !== "qr") {
      return NextResponse.json(
        { ok: false, error: "source musí být 'button' nebo 'qr'" },
        { status: 400 }
      );
    }

    const result = await markVisited(body.placeId, source);

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error || "Nepodařilo se uložit návštěvu" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/visits error:", error);
    return NextResponse.json(
      { ok: false, error: "Interní chyba serveru" },
      { status: 500 }
    );
  }
}
