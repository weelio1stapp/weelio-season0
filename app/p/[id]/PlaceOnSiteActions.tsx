"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Camera, BookOpen } from "lucide-react";
import VisitDialog from "./VisitDialog";

type PlaceOnSiteActionsProps = {
  placeId: string;
  placeName: string;
  alreadyVisited: boolean;
  isAuthenticated: boolean;
};

export default function PlaceOnSiteActions({
  placeId,
  placeName,
  alreadyVisited,
  isAuthenticated,
}: PlaceOnSiteActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!isAuthenticated) {
    return null; // Don't show for logged-out users
  }

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

          {/* Visit Button - SECONDARY */}
          <div className="pt-2 space-y-2">
            {alreadyVisited ? (
              <Button
                variant="outline"
                className="w-full"
                disabled
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Už jsi tu dnes byl
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setDialogOpen(true)}
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
      />
    </>
  );
}
