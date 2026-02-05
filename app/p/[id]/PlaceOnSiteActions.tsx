"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Camera, BookOpen, Edit3, X } from "lucide-react";
import VisitDialog from "./VisitDialog";

type PlaceOnSiteActionsProps = {
  placeId: string;
  placeName: string;
  alreadyVisited: boolean;
  isAuthenticated: boolean;
};

type VisitResult = {
  xp_delta: number;
  visit_id: string;
  journal_entry_id: string | null;
  is_duplicate: boolean;
};

export default function PlaceOnSiteActions({
  placeId,
  placeName,
  alreadyVisited,
  isAuthenticated,
}: PlaceOnSiteActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [visitResult, setVisitResult] = useState<VisitResult | null>(null);
  const [hideCTA, setHideCTA] = useState(false);

  if (!isAuthenticated) {
    return null; // Don't show for logged-out users
  }

  const hasVisited = alreadyVisited || visitResult !== null;
  const showSuccessBlock = visitResult !== null;

  const handleVisitRecorded = (result: VisitResult) => {
    setVisitResult(result);
    setHideCTA(false); // Reset CTA visibility when new visit is recorded
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  return (
    <>
      <Card className="border-2 bg-muted/40">
        <CardHeader>
          <CardTitle className="text-lg">Na místě můžeš</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* What you can do on-site */}
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
              <span>Potvrdit návštěvu a získat XP</span>
            </li>
            <li className="flex items-start gap-2">
              <Camera className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
              <span>Přidat fotku, vzkaz nebo audio</span>
            </li>
            <li className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
              <span>Zapsat zážitek do deníku</span>
            </li>
          </ul>

          {/* Success Block - shown after visit confirmation */}
          {showSuccessBlock && (
            <Alert className="border-2 border-primary/50 bg-primary/5 animate-in fade-in zoom-in-50 duration-200">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <AlertTitle className="text-base font-semibold">
                Stopa zanechána
              </AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                {visitResult.is_duplicate
                  ? "Už jsi tu dnes byl"
                  : "Byl jsi tu dnes"}
              </AlertDescription>
            </Alert>
          )}

          {/* Journal CTA - shown after visit if not hidden */}
          {showSuccessBlock && !hideCTA && (
            <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex gap-2">
                {visitResult.journal_entry_id ? (
                  <Button
                    variant="outline"
                    className="flex-1"
                    asChild
                  >
                    <Link href={`/journal/edit/${visitResult.journal_entry_id}`}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Upravit zápis
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleOpenDialog}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Zapsat do deníku
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHideCTA(true)}
                  className="px-3"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Zápis ti za pár měsíců udělá radost
              </p>
            </div>
          )}

          {/* Visit Button */}
          <div className="pt-2 space-y-2">
            {hasVisited ? (
              <>
                <Button variant="outline" className="w-full" disabled>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Už jsi tu dnes byl
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Znovu můžeš zítra.
                </p>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleOpenDialog}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Byl jsem tady
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Použij až na místě – ideálně hned po příchodu.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <VisitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        placeId={placeId}
        placeName={placeName}
        onVisitRecorded={handleVisitRecorded}
      />
    </>
  );
}
