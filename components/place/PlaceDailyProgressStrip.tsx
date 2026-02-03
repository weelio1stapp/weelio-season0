"use client";

import { useState, useEffect, useRef } from "react";
import { MapPinCheck, NotebookPen, KeyRound, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import VisitedButton from "@/components/VisitedButton";
import QuickJournalModal from "@/components/journal/QuickJournalModal";
import { copy } from "@/lib/copy";

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
      showHint(copy.place.hints.riddlesNoAttempts);
      return;
    }

    const element = document.getElementById("place-riddles");
    if (!element) {
      showHint(copy.place.hints.riddlesNone);
      return;
    }

    showHint(copy.place.hints.riddlesDown);
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
      ? copy.place.daily.riddlesLabel
      : riddleRemaining === 0
        ? copy.place.daily.riddlesDoneToday
        : `${copy.place.daily.riddlesLabel} (${copy.riddles.badge.remaining(riddleRemaining, copy.riddles.attempts.limit)})`;

  return (
    <>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{copy.place.daily.title}</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto p-1">
                  <Info className="w-4 h-4 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">{copy.place.daily.infoPopover.title}</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>{copy.place.daily.infoPopover.visitExplain}</p>
                    <p>{copy.place.daily.infoPopover.journalExplain}</p>
                    <p>{copy.place.daily.infoPopover.riddlesExplain}</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

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
                  {alreadyVisited ? copy.place.daily.visitedStatus : copy.place.daily.notVisitedStatus}
                </span>
              </div>
              {alreadyVisited ? (
                <div onClick={() => showHint(copy.place.hints.visitAlready)}>
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
                          : copy.place.hints.visitLogged
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
                        : copy.place.hints.visitLogged
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
                  {journalSavedToday ? copy.place.daily.journalSavedStatus : copy.place.daily.journalNotSavedStatus}
                </span>
              </div>
              {journalSavedToday ? (
                <div onClick={() => showHint(copy.place.hints.journalAlready)}>
                  <Button variant="secondary" size="sm" disabled>
                    {copy.common.done}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsJournalOpen(true)}
                >
                  {copy.place.daily.journalCta}
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
                {copy.place.daily.riddlesCta}
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
          showHint(copy.common.savedCheck);
        }}
      />
    </>
  );
}
