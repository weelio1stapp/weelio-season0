"use client";

import { useState, useEffect, useRef } from "react";
import { MapPinCheck, NotebookPen, KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import VisitedButton from "@/components/VisitedButton";
import QuickJournalModal from "@/components/journal/QuickJournalModal";

type PlaceDailyProgressStripProps = {
  placeId: string;
  isAuthenticated: boolean;
  alreadyVisited: boolean;
};

export default function PlaceDailyProgressStrip({
  placeId,
  isAuthenticated,
  alreadyVisited,
}: PlaceDailyProgressStripProps) {
  const [journalSavedToday, setJournalSavedToday] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [riddleRemaining, setRiddleRemaining] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
            <p className="mb-3 text-xs text-muted-foreground text-center animate-in fade-in duration-200">
              {hint}
            </p>
          )}

          <div className="space-y-3">
            {/* Visit row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPinCheck className="w-4 h-4 opacity-60" />
                <span className="opacity-80">
                  {alreadyVisited ? "✓ Navštíveno" : "○ Navštívit"}
                </span>
              </div>
              {alreadyVisited ? (
                <div onClick={() => showHint("Dnes už máš zapsáno 🙃")}>
                  <VisitedButton
                    placeId={placeId}
                    alreadyVisited={alreadyVisited}
                    variant="compact"
                    disabled={true}
                    suppressJournalPrompt={true}
                    onVisited={({ xpDelta, streakWeeks }) =>
                      showHint(
                        xpDelta > 0
                          ? `+${xpDelta} XP • streak ${streakWeeks} 🔥`
                          : `Návštěva zaznamenána ✅`
                      )
                    }
                  />
                </div>
              ) : (
                <VisitedButton
                  placeId={placeId}
                  alreadyVisited={alreadyVisited}
                  variant="compact"
                  suppressJournalPrompt={true}
                  onVisited={({ xpDelta, streakWeeks }) =>
                    showHint(
                      xpDelta > 0
                        ? `+${xpDelta} XP • streak ${streakWeeks} 🔥`
                        : `Návštěva zaznamenána ✅`
                    )
                  }
                />
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
                <div onClick={() => showHint("Už jsi dnes zapsal 😉")}>
                  <Button variant="secondary" size="sm" disabled>
                    Hotovo
                  </Button>
                </div>
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
                Na kešky
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
