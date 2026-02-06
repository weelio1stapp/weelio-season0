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

    // 1) Load all active riddles for place (exclude hidden)
    const { data: riddles, error: riddlesError } = await supabase
      .from("place_riddles")
      .select("id, place_id, prompt, answer_type, xp_reward, max_attempts, cooldown_hours, created_by, created_at")
      .eq("place_id", place_id)
      .eq("is_active", true)
      .eq("is_hidden", false)
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

    // 2) If user is authenticated, load attempts and solves (windowed by cooldown)
    let attemptsMap = new Map<string, number>(); // riddle_id -> count within window
    let solvedMap = new Map<string, Date>(); // riddle_id -> created_at of last correct attempt

    if (user) {
      const riddleIds = riddles.map((r) => r.id);

      // Load ALL attempts for this user for these riddles (need created_at for windowing)
      const { data: allAttempts, error: attemptsError } = await supabase
        .from("place_riddle_attempts")
        .select("riddle_id, is_correct, created_at")
        .eq("user_id", user.id)
        .in("riddle_id", riddleIds)
        .order("created_at", { ascending: false });

      if (attemptsError) {
        console.error("Load attempts error:", {
          code: attemptsError.code,
          message: attemptsError.message,
          details: (attemptsError as any).details,
          hint: (attemptsError as any).hint,
        });
      }

      // Process attempts per riddle with windowing
      if (!attemptsError && allAttempts) {
        const now = new Date();

        riddles.forEach((riddle) => {
          const cooldownHours = riddle.cooldown_hours ?? 24;
          const windowStart = new Date(now.getTime() - cooldownHours * 60 * 60 * 1000);

          const riddleAttempts = allAttempts.filter((a) => a.riddle_id === riddle.id);

          // Count attempts within window
          const windowedAttempts = riddleAttempts.filter((a) => {
            const attemptDate = new Date(a.created_at);
            return attemptDate >= windowStart;
          });
          attemptsMap.set(riddle.id, windowedAttempts.length);

          // Find last correct attempt within window
          const lastCorrect = riddleAttempts.find((a) => {
            const attemptDate = new Date(a.created_at);
            return a.is_correct && attemptDate >= windowStart;
          });

          if (lastCorrect) {
            solvedMap.set(riddle.id, new Date(lastCorrect.created_at));
          }
        });
      }
    }

    // 3) Enrich each riddle with attempts_left, solved, can_delete, next_available_at
    const enriched = riddles.map((r) => {
      const maxAttempts = r.max_attempts ?? 3;
      const cooldownHours = r.cooldown_hours ?? 24;
      const attemptsUsed = attemptsMap.get(r.id) || 0;
      const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);
      const lastCorrectDate = solvedMap.get(r.id);
      const solved = !!lastCorrectDate;
      const canDelete = user?.id ? r.created_by === user.id : false;

      // Compute next_available_at if solved
      let nextAvailableAt: string | null = null;
      if (lastCorrectDate) {
        const nextAvailable = new Date(lastCorrectDate.getTime() + cooldownHours * 60 * 60 * 1000);
        nextAvailableAt = nextAvailable.toISOString();
      }

      return {
        id: r.id,
        place_id: r.place_id,
        prompt: r.prompt,
        answer_type: r.answer_type,
        xp_reward: r.xp_reward,
        max_attempts: maxAttempts,
        cooldown_hours: cooldownHours,
        created_by: r.created_by,
        created_at: r.created_at,

        // Enriched data
        attempts_left: attemptsLeft,
        solved,
        can_delete: canDelete,
        next_available_at: nextAvailableAt,
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
