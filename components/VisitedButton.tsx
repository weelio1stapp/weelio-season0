"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { copy } from "@/lib/copy";

interface VisitedButtonProps {
  placeId: string;
  alreadyVisited: boolean;
  variant?: "default" | "compact";
  disabled?: boolean;
  suppressJournalPrompt?: boolean;
  onVisited?: (info: {
    xpDelta: number;
    streakWeeks: number;
    bestStreakWeeks: number;
  }) => void;
}

const JOURNAL_NUDGE_KEY = "weelio_journal_nudge_hide_until";

export default function VisitedButton({
  placeId,
  alreadyVisited: initialVisited,
  variant = "default",
  disabled = false,
  suppressJournalPrompt = false,
  onVisited,
}: VisitedButtonProps) {
  const router = useRouter();
  const [visited, setVisited] = useState(initialVisited);
  const [pending, setPending] = useState(false);
  const [showJournalPrompt, setShowJournalPrompt] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);

  // Format today's date for display
  const todayFormatted = new Date().toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  // Check if journal prompt should be shown today
  const shouldShowJournalPrompt = (): boolean => {
    if (typeof window === "undefined") return false;

    const hideUntil = localStorage.getItem(JOURNAL_NUDGE_KEY);
    if (!hideUntil) return true;

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return hideUntil < today; // Show if hideUntil date is in the past
  };

  // Handle "Don't show today" checkbox action
  const handleHideToday = () => {
    if (typeof window === "undefined") return;

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    localStorage.setItem(JOURNAL_NUDGE_KEY, today);
  };

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
        toast.info(copy.visit.toast.alreadyVisited);
        setVisited(true);
        return;
      }

      if (response.status === 401 || data.code === "UNAUTHORIZED") {
        // Not authenticated
        toast.error(copy.visit.toast.mustLogin);
        return;
      }

      if (!response.ok || !data.ok) {
        // Other error
        toast.error(copy.visit.toast.failed);
        return;
      }

      // Success - show XP feedback
      const xpDelta = data.xp_delta ?? 0;
      const streakWeeks = data.streak_weeks ?? 0;
      const bestStreakWeeks = data.best_streak_weeks ?? 0;

      if (xpDelta > 0) {
        toast.success(
          `+${xpDelta} XP • streak ${streakWeeks} 🔥 (best ${bestStreakWeeks})`
        );
      } else {
        toast.success(copy.visit.toast.recorded);
      }

      setVisited(true);
      router.refresh();

      // Call onVisited callback if provided
      onVisited?.({ xpDelta, streakWeeks, bestStreakWeeks });

      // Show journal prompt if not hidden today and not suppressed
      if (!suppressJournalPrompt && shouldShowJournalPrompt()) {
        setShowJournalPrompt(true);
      }
    } catch (err) {
      console.error("Failed to mark visited:", err);
      toast.error(copy.visit.toast.failed);
    } finally {
      setPending(false);
    }
  };

  // Compact variant for mobile action bar
  if (variant === "compact") {
    return (
      <>
        <Button
          onClick={handleClick}
          disabled={disabled || visited || pending}
          size="sm"
          variant={visited ? "secondary" : "default"}
          className="w-full"
        >
          {pending && (
            <svg
              className="animate-spin h-3 w-3 mr-1"
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
          {pending ? "..." : visited ? copy.common.todayDone : copy.visit.button.compact}
        </Button>

        {/* Journal Prompt Modal */}
        <Dialog open={showJournalPrompt} onOpenChange={setShowJournalPrompt}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Chceš si to zapsat?</DialogTitle>
              <DialogDescription>
                Krátký zápis z výletu ti za pár měsíců udělá radost. Klidně jen 1 věta.
              </DialogDescription>
            </DialogHeader>

            {/* Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="dont-show-today"
                checked={dontShowToday}
                onCheckedChange={(checked) => setDontShowToday(checked === true)}
              />
              <label
                htmlFor="dont-show-today"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Neukazovat znovu dnes
              </label>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (dontShowToday) {
                    handleHideToday();
                  }
                  setShowJournalPrompt(false);
                }}
              >
                Teď ne
              </Button>
              <Button
                onClick={() => {
                  if (dontShowToday) {
                    handleHideToday();
                  }
                  setShowJournalPrompt(false);
                  router.push(`/journal/new?placeId=${placeId}`);
                }}
              >
                Zapsat do deníku
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Default variant
  return (
    <>
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
            {pending ? copy.visit.button.recording : visited ? copy.visit.button.todayDone : copy.visit.button.default}
          </span>
          {visited && (
            <span className="text-xs opacity-70">{todayFormatted}</span>
          )}
        </button>
      </div>

      {/* Journal Prompt Modal */}
      <Dialog open={showJournalPrompt} onOpenChange={setShowJournalPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chceš si to zapsat?</DialogTitle>
            <DialogDescription>
              Krátký zápis z výletu ti za pár měsíců udělá radost. Klidně jen 1 věta.
            </DialogDescription>
          </DialogHeader>

          {/* Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="dont-show-today"
              checked={dontShowToday}
              onCheckedChange={(checked) => setDontShowToday(checked === true)}
            />
            <label
              htmlFor="dont-show-today"
              className="text-sm text-muted-foreground cursor-pointer select-none"
            >
              Neukazovat znovu dnes
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (dontShowToday) {
                  handleHideToday();
                }
                setShowJournalPrompt(false);
              }}
            >
              Teď ne
            </Button>
            <Button
              onClick={() => {
                if (dontShowToday) {
                  handleHideToday();
                }
                setShowJournalPrompt(false);
                router.push(`/journal/new?placeId=${placeId}`);
              }}
            >
              Zapsat do deníku
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
