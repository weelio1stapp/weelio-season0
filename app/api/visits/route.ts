import { NextRequest, NextResponse } from "next/server";
import { markVisited, type VisitSource } from "@/lib/db/visits";
import { revalidatePath } from "next/cache";

type RequestBody = {
  placeId: string;
  source?: VisitSource;
};

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    if (!body.placeId) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: "placeId je povinné pole" },
        { status: 400 }
      );
    }

    const source = body.source || "button";

    // Validate source
    if (source !== "button" && source !== "qr") {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: "source musí být 'button' nebo 'qr'" },
        { status: 400 }
      );
    }

    const result = await markVisited(body.placeId, source);

    // Handle unauthorized
    if (result.isUnauthorized) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Handle duplicate (already visited today)
    if (result.isDuplicate) {
      return NextResponse.json(
        { ok: false, code: "ALREADY_VISITED_TODAY" },
        { status: 409 }
      );
    }

    // Handle other errors
    if (!result.success) {
      console.error("markVisited failed:", {
        error: result.error,
      });
      return NextResponse.json(
        { ok: false, code: "UNKNOWN", error: result.error },
        { status: 500 }
      );
    }

    // Success - revalidate relevant paths
    try {
      revalidatePath("/leaderboard");
      revalidatePath("/me");
      revalidatePath(`/p/${body.placeId}`);
    } catch (revalidateError) {
      console.error("Revalidation error:", revalidateError);
      // Don't fail the request if revalidation fails
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/visits error:", error);
    return NextResponse.json(
      { ok: false, code: "UNKNOWN", error: "Interní chyba serveru" },
      { status: 500 }
    );
  }
}
