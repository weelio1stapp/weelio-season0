"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  const [riddleRemaining, setRiddleRemaining] = useState<number | null>(null);

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

  if (!isAuthenticated) return null;

  // Format riddle status text
  const riddleText =
    riddleRemaining === null
      ? "Kešky: —"
      : riddleRemaining === 0
        ? "Kešky: dnes už ne 😅"
        : `Kešky: ${riddleRemaining}/5 pokusů`;

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <h3 className="text-sm font-semibold mb-4">Dnes na tomhle místě</h3>

        <div className="space-y-3 text-sm">
          {/* Visit status */}
          <div className="flex items-center justify-between">
            <span className="opacity-80">Návštěva</span>
            <span className={alreadyVisited ? "font-medium" : "opacity-60"}>
              {alreadyVisited ? "✓ Navštíveno" : "○ Navštívit"}
            </span>
          </div>

          <Separator />

          {/* Journal status */}
          <div className="flex items-center justify-between">
            <span className="opacity-80">Zápis</span>
            <span className={journalSavedToday ? "font-medium" : "opacity-60"}>
              {journalSavedToday ? "✓ Zapsáno" : "○ Zapsat"}
            </span>
          </div>

          <Separator />

          {/* Riddle status */}
          <div className="flex items-center justify-between">
            <span className="opacity-80">{riddleText}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
