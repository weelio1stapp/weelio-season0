"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPinCheck, NotebookPen, KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import QuickJournalModal from "@/components/journal/QuickJournalModal";

type PlaceDailyProgressStripProps = {
  placeId: string;
  isAuthenticated: boolean;
  alreadyVisited: boolean;
};

export default function PlaceDailyProgressStrip({
  placeId,
  isAuthenticated,
  alreadyVisited: initialVisited,
}: PlaceDailyProgressStripProps) {
  const router = useRouter();
  const [visited, setVisited] = useState(initialVisited);
  const [visitPending, setVisitPending] = useState(false);
  const [journalSavedToday, setJournalSavedToday] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [riddleRemaining, setRiddleRemaining] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update visited state when prop changes
  useEffect(() => {
    setVisited(initialVisited);
  }, [initialVisited]);

  // Check if journal was saved today (localStorage)
  useEffect(() => {
    if (!isAuthenticated) return;

    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const journalKey = `weelio_journal_saved_${placeId}_${today}`;
      const saved = localStorage.getItem(journalKey);

      if (saved === "1") {
        setJournalSavedToday(true);
      }
    } catch (error) {
      // Silent fail
    }
  }, [isAuthenticated, placeId]);

  // Fetch riddle attempts status
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchRiddleStatus = async () => {
      try {
        const response = await fetch(
          `/api/riddles/status?placeId=${encodeURIComponent(placeId)}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) return; // Silent fail

        const data = await response.json();
        if (data.ok && typeof data.remaining === "number") {
          setRiddleRemaining(data.remaining);
        }
      } catch (error) {
        // Silent fail
      }
    };

    fetchRiddleStatus();
  }, [isAuthenticated, placeId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

  const showHint = (text: string, ms = 2200) => {
    // Clear existing timeout
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }

    setHint(text);
    hintTimeoutRef.current = setTimeout(() => {
      setHint(null);
      hintTimeoutRef.current = null;
    }, ms);
  };

  // Handle visit action (POST /api/visits)
  const handleVisit = async () => {
    if (visited || visitPending) return;

    setVisitPending(true);

    try {
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placeId,
          source: "progress-strip",
        }),
      });

      const data = await response.json();

      // Handle different response codes
      if (response.status === 409 || data.code === "ALREADY_VISITED_TODAY") {
        showHint("Dnes už máš zapsáno 🙃");
        setVisited(true);
        return;
      }

      if (response.status === 401 || data.code === "UNAUTHORIZED") {
        showHint("Musíš být přihlášen");
        return;
      }

      if (!response.ok || !data.ok) {
        showHint("Nepodařilo se zapsat návštěvu");
        return;
      }

      // Success
      const xpDelta = data.xp_delta ?? 0;
      const streakWeeks = data.streak_weeks ?? 0;

      if (xpDelta > 0) {
        showHint(`+${xpDelta} XP • streak ${streakWeeks} 🔥`);
      } else {
        showHint("Návštěva zaznamenána ✅");
      }

      setVisited(true);
      router.refresh();
    } catch (err) {
      console.error("Failed to mark visited:", err);
      showHint("Nepodařilo se zapsat návštěvu");
    } finally {
      setVisitPending(false);
    }
  };

  // Handle riddles scroll
  const handleRiddlesScroll = () => {
    // Check if no attempts remaining
    if (riddleRemaining === 0) {
      showHint("Dnes už nemáš pokusy 😅");
      return;
    }

    const element = document.getElementById("place-riddles");
    if (!element) {
      showHint("Kešky zatím nejsou 🥲");
      return;
    }

    showHint("Hádanky dole 👇");
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    // Try to focus first input in riddles section after scroll
    setTimeout(() => {
      const input = element.querySelector("input");
      if (input) {
        input.focus();
      }
    }, 500);
  };

  if (!isAuthenticated) return null;

  // Format riddle status text
  const riddleText =
    riddleRemaining === null
      ? "Kešky"
      : riddleRemaining === 0
        ? "Kešky (dnes hotovo)"
        : `Kešky (${riddleRemaining}/5)`;

  return (
    <>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold mb-3">Dnes na tomhle místě</h3>

          {/* Hint text */}
          {hint && (
            <p className="mb-3 text-xs text-muted-foreground animate-in fade-in duration-200">
              {hint}
            </p>
          )}

          <div className="space-y-3">
            {/* Visit row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPinCheck className="w-4 h-4 opacity-60" />
                <span className="opacity-80">
                  {visited ? "✓ Navštíveno" : "○ Navštívit"}
                </span>
              </div>
              {visited ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled
                  onClick={() => showHint("Dnes už máš zapsáno 🙃")}
                >
                  Hotovo
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleVisit}
                  disabled={visitPending}
                >
                  {visitPending ? "..." : "Zapsat"}
                </Button>
              )}
            </div>

            <Separator />

            {/* Journal row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <NotebookPen className="w-4 h-4 opacity-60" />
                <span className="opacity-80">
                  {journalSavedToday ? "✓ Zapsáno" : "○ Zapsat"}
                </span>
              </div>
              {journalSavedToday ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled
                  onClick={() => showHint("Už jsi dnes zapsal 😉")}
                >
                  Hotovo
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsJournalOpen(true)}
                >
                  Napsat
                </Button>
              )}
            </div>

            <Separator />

            {/* Riddles row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <KeyRound className="w-4 h-4 opacity-60" />
                <span className="opacity-80">{riddleText}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRiddlesScroll}
                disabled={riddleRemaining === 0}
              >
                {riddleRemaining === 0 ? "Hotovo" : "Jít"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journal Modal */}
      <QuickJournalModal
        placeId={placeId}
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        onSuccess={() => {
          const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
          const journalKey = `weelio_journal_saved_${placeId}_${today}`;
          localStorage.setItem(journalKey, "1");
          setJournalSavedToday(true);
          showHint("Uloženo ✅");
        }}
      />
    </>
  );
}
