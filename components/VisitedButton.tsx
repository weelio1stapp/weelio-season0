"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface VisitedButtonProps {
  placeId: string;
  alreadyVisited: boolean;
}

export default function VisitedButton({
  placeId,
  alreadyVisited: initialVisited,
}: VisitedButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [visited, setVisited] = useState(initialVisited);
  const [pending, setPending] = useState(false);

  // Format today's date for display
  const todayFormatted = new Date().toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  const handleClick = async () => {
    if (visited || pending) return;

    setPending(true);

    try {
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placeId,
          source: "button",
        }),
      });

      const data = await response.json();

      // Handle different response codes
      if (response.status === 409 || data.code === "ALREADY_VISITED_TODAY") {
        // Already visited today
        showToast("Dnes už máš zapsáno 🙃", "info");
        setVisited(true);
        return;
      }

      if (response.status === 401 || data.code === "UNAUTHORIZED") {
        // Not authenticated
        showToast("Musíš být přihlášen", "error");
        return;
      }

      if (!response.ok || !data.ok) {
        // Other error
        showToast("Nepodařilo se zapsat návštěvu", "error");
        return;
      }

      // Success - show XP feedback
      const xpDelta = data.xp_delta ?? 0;
      const streakWeeks = data.streak_weeks ?? 0;
      const bestStreakWeeks = data.best_streak_weeks ?? 0;

      if (xpDelta > 0) {
        showToast(
          `+${xpDelta} XP • streak ${streakWeeks} 🔥 (best ${bestStreakWeeks})`,
          "success"
        );
      } else {
        showToast("Návštěva zaznamenána ✅", "success");
      }

      setVisited(true);
      router.refresh();
    } catch (err) {
      console.error("Failed to mark visited:", err);
      showToast("Nepodařilo se zapsat návštěvu", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleClick}
        disabled={visited || pending}
        className={`
          inline-flex flex-col items-center gap-1 rounded-lg px-6 py-3 text-sm font-semibold
          transition-all duration-200
          ${
            visited
              ? "bg-green-100 text-green-800 cursor-not-allowed"
              : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 active:scale-95"
          }
          ${pending ? "opacity-50 cursor-wait" : ""}
        `}
      >
        <span className="flex items-center gap-2">
          {pending && (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          {pending ? "Zaznamenávám…" : visited ? "✓ Dnes už máš hotovo" : "Byl jsem tady"}
        </span>
        {visited && (
          <span className="text-xs opacity-70">{todayFormatted}</span>
        )}
      </button>
    </div>
  );
}
