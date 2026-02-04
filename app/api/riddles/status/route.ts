import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/serverClient";

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();

    // Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json().catch(() => null);
    const { place_id } = body ?? {};

    if (!place_id) {
      return NextResponse.json(
        { ok: false, error: "Neplatná data" },
        { status: 400 }
      );
    }

    // 1) Load all active riddles for place
    const { data: riddles, error: riddlesError } = await supabase
      .from("place_riddles")
      .select("id, place_id, prompt, answer_type, xp_reward, max_attempts, created_by, created_at")
      .eq("place_id", place_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (riddlesError) {
      console.error("Load riddles error:", {
        message: riddlesError.message,
        details: (riddlesError as any).details,
        hint: (riddlesError as any).hint,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Nepodařilo se načíst kešky",
          details: riddlesError.message,
        },
        { status: 500 }
      );
    }

    if (!riddles || riddles.length === 0) {
      return NextResponse.json({
        ok: true,
        place_id,
        riddles: [],
      });
    }

    // 2) If user is authenticated, load attempts and solves
    let attemptsMap = new Map<string, number>(); // riddle_id -> count
    let solvedSet = new Set<string>(); // riddle_id

    if (user) {
      const riddleIds = riddles.map((r) => r.id);

      // Count attempts per riddle
      const { data: attemptCounts, error: attemptsError } = await supabase
        .from("place_riddle_attempts")
        .select("riddle_id")
        .eq("user_id", user.id)
        .in("riddle_id", riddleIds);

      if (!attemptsError && attemptCounts) {
        attemptCounts.forEach((a) => {
          const count = attemptsMap.get(a.riddle_id) || 0;
          attemptsMap.set(a.riddle_id, count + 1);
        });
      }

      // Check which are solved
      const { data: solves, error: solvesError } = await supabase
        .from("place_riddle_attempts")
        .select("riddle_id")
        .eq("user_id", user.id)
        .eq("is_correct", true)
        .in("riddle_id", riddleIds);

      if (!solvesError && solves) {
        solves.forEach((s) => {
          solvedSet.add(s.riddle_id);
        });
      }
    }

    // 3) Enrich each riddle with attempts_left, solved, can_delete
    const enriched = riddles.map((r) => {
      const maxAttempts = r.max_attempts ?? 3;
      const attemptsUsed = attemptsMap.get(r.id) || 0;
      const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);
      const solved = solvedSet.has(r.id);
      const canDelete = user?.id ? r.created_by === user.id : false;

      return {
        id: r.id,
        place_id: r.place_id,
        prompt: r.prompt,
        answer_type: r.answer_type,
        xp_reward: r.xp_reward,
        max_attempts: maxAttempts,
        created_by: r.created_by,
        created_at: r.created_at,

        // Enriched data
        attempts_left: attemptsLeft,
        solved,
        can_delete: canDelete,
      };
    });

    return NextResponse.json({
      ok: true,
      place_id,
      riddles: enriched,
    });
  } catch (err: any) {
    console.error("Riddle status fatal error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Nepodařilo se načíst kešky",
        details: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
