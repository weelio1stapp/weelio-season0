"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPinCheck, NotebookPen, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import VisitedButton from "@/components/VisitedButton";
import QuickJournalModal from "@/components/journal/QuickJournalModal";

type PlaceNextStepsProps = {
  placeId: string;
  isAuthenticated: boolean;
  alreadyVisited: boolean;
};

export default function PlaceNextSteps({
  placeId,
  isAuthenticated,
  alreadyVisited,
}: PlaceNextStepsProps) {
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // Try to focus first input in riddles section after scroll
      setTimeout(() => {
        const input = element.querySelector("input");
        if (input) {
          input.focus();
        }
      }, 500);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Co dál?</CardTitle>
          <CardDescription>
            Přihlaš se a získej přístup ke všem funkcím.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center py-4">
            <Button asChild size="lg">
              <Link href="/leaderboard">Přihlásit se</Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => scrollToSection("place-journal")}
            >
              Prohlížet zápisky a kešky
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Co dál?</CardTitle>
          <CardDescription>
            Vyber si akci – zabere to pár vteřin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Action 1: Record Visit */}
            <div className="flex flex-col items-center text-center p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <MapPinCheck className="w-6 h-6 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-semibold mb-1">Zapsat návštěvu</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Přidá XP a streak
              </p>
              <div className="w-full flex justify-center">
                <VisitedButton
                  placeId={placeId}
                  alreadyVisited={alreadyVisited}
                />
              </div>
            </div>

            {/* Action 2: Write Journal Entry */}
            <div className="flex flex-col items-center text-center p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <NotebookPen className="w-6 h-6 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-semibold mb-1">Napsat zápis</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Sdílej zážitek s ostatními
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsJournalModalOpen(true)}
                className="w-full"
              >
                Napsat
              </Button>
            </div>

            {/* Action 3: Try Riddles */}
            <div className="flex flex-col items-center text-center p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <KeyRound className="w-6 h-6 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-semibold mb-1">Zkusit kešku</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Odpověz správně a získej XP
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollToSection("place-riddles")}
                className="w-full"
              >
                Zkusit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journal Modal */}
      <QuickJournalModal
        placeId={placeId}
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
      />
    </>
  );
}
