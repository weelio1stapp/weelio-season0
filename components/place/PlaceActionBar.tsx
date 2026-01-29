"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { NotebookPen, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VisitedButton from "@/components/VisitedButton";
import QuickJournalModal from "@/components/journal/QuickJournalModal";

type PlaceActionBarProps = {
  placeId: string;
  isAuthenticated: boolean;
  alreadyVisited: boolean;
};

export default function PlaceActionBar({
  placeId,
  isAuthenticated,
  alreadyVisited,
}: PlaceActionBarProps) {
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [riddleRemaining, setRiddleRemaining] = useState<number | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch riddle attempts status
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchRiddleStatus = async () => {
      try {
        const response = await fetch(
          `/api/riddles/status?placeId=${encodeURIComponent(placeId)}`
        );
        if (!response.ok) return; // Silently ignore errors

        const data = await response.json();
        if (data.ok && typeof data.remaining === "number") {
          setRiddleRemaining(data.remaining);
        }
      } catch (error) {
        // Silently ignore fetch errors
        console.error("Failed to fetch riddle status:", error);
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

  const scrollToRiddles = () => {
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

  if (!isAuthenticated) {
    return (
      <>
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur border-t">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link href="/leaderboard">Přihlásit se</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Procházet
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur border-t">
        <div className="max-w-5xl mx-auto px-4 py-3">
          {/* Hint text */}
          {hint && (
            <p className="mb-2 text-xs text-muted-foreground text-center animate-in fade-in duration-200">
              {hint}
            </p>
          )}

          <div className="flex gap-2">
            {/* Visit Button */}
            {alreadyVisited ? (
              <div
                className="flex-1"
                onClick={() => showHint("Dnes už máš zapsáno 🙃")}
              >
                <VisitedButton
                  placeId={placeId}
                  alreadyVisited={alreadyVisited}
                  variant="compact"
                  disabled={true}
                  onVisited={({ xpDelta, streakWeeks }) =>
                    showHint(`+${xpDelta} XP • streak ${streakWeeks} 🔥`)
                  }
                />
              </div>
            ) : (
              <div className="flex-1">
                <VisitedButton
                  placeId={placeId}
                  alreadyVisited={alreadyVisited}
                  variant="compact"
                  onVisited={({ xpDelta, streakWeeks }) =>
                    showHint(`+${xpDelta} XP • streak ${streakWeeks} 🔥`)
                  }
                />
              </div>
            )}

            {/* Journal Button */}
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIsJournalOpen(true)}
            >
              <NotebookPen className="w-4 h-4 mr-1" />
              Zapsat
            </Button>

            {/* Riddles Button */}
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={scrollToRiddles}
            >
              <KeyRound className="w-4 h-4 mr-1" />
              Keška
              {riddleRemaining !== null && (
                <Badge variant="secondary" className="ml-2">
                  {riddleRemaining}/5
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Journal Modal */}
      <QuickJournalModal
        placeId={placeId}
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        onSuccess={() => showHint("Uloženo ✅")}
      />
    </>
  );
}
