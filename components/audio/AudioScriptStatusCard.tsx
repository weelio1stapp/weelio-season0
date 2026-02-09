import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/Button";
import type { AudioScriptStatusData } from "@/lib/audio/audioScriptStatus";

type Props = {
  placeId: string;
  statusData: AudioScriptStatusData;
  isAuthor: boolean;
};

export default function AudioScriptStatusCard({
  placeId,
  statusData,
  isAuthor,
}: Props) {
  const { status, totalPoints, filledPoints, hasIntro } = statusData;

  // Compute progress: intro counts as 1 extra step
  const totalSteps = totalPoints + 1; // +1 for intro
  const completedSteps = (hasIntro ? 1 : 0) + filledPoints;
  const progressPercentage = totalSteps > 0
    ? Math.round((completedSteps / totalSteps) * 100)
    : 0;

  // Status badge config
  const statusConfig = {
    complete: {
      label: "Kompletní",
      variant: "default" as const,
      color: "bg-green-100 text-green-800 border-green-300",
    },
    partial: {
      label: "Rozpracovaný",
      variant: "secondary" as const,
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    },
    empty: {
      label: "Chybí",
      variant: "outline" as const,
      color: "bg-red-100 text-red-800 border-red-300",
    },
  };

  const config = statusConfig[status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Audio scénář trasy</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Stav připravenosti audio průvodce
            </p>
          </div>
          <Badge className={config.color}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Průběh</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Summary text */}
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Úvod trasy:</span>
            <span className={hasIntro ? "text-green-600" : "text-red-600"}>
              {hasIntro ? "✓ Vyplněno" : "✗ Chybí"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Body trasy:</span>
            <span>
              {filledPoints} z {totalPoints}
            </span>
          </div>
        </div>

        {/* CTA - only if author and not complete */}
        {isAuthor && status !== "complete" && (
          <div className="pt-2">
            <Link href={`/p/${placeId}/edit#audio`}>
              <Button variant="primary" className="w-full">
                Doplnit audio scénář
              </Button>
            </Link>
          </div>
        )}

        {/* Helper text */}
        {status === "complete" && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
            Audio scénář je kompletní! Generování a přehrávání audia bude
            doplněno v budoucí verzi.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
