"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { completePlannedRun } from "./planActions";
import type { UserRunPlan } from "@/lib/db/runPlans";

type PlannedRunCardProps = {
  plan: UserRunPlan;
};

export default function PlannedRunCard({ plan }: PlannedRunCardProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");

  const handleComplete = async () => {
    setIsCompleting(true);
    setError("");

    const result = await completePlannedRun(plan.id);

    setIsCompleting(false);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Chyba při dokončování");
    }
  };

  const date = new Date(plan.planned_at);
  const dateStr = date.toLocaleDateString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
      <div className="flex flex-col gap-1">
        <span className="font-medium">
          {dateStr} {timeStr}
        </span>
        <div className="flex gap-3 text-muted-foreground">
          <span>{plan.distance_km} km</span>
          {plan.target_duration_min && (
            <span>cíl: {plan.target_duration_min} min</span>
          )}
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={isCompleting}>
            Splněno
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Označit jako splněno?</AlertDialogTitle>
            <AlertDialogDescription>
              Tím se vytvoří záznam dokončeného běhu a plán bude uzavřen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? "Ukládám..." : "Potvrdit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
