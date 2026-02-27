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
import { deleteMyRun } from "./actions";
import type { UserRun } from "@/lib/db/runs";

type CompletedRunCardProps = {
  run: UserRun;
};

export default function CompletedRunCard({ run }: CompletedRunCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setIsDeleting(true);
    setError("");

    const result = await deleteMyRun(run.id);

    setIsDeleting(false);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Chyba při mazání");
    }
  };

  const date = new Date(run.ran_at);
  const dateStr = date.toLocaleDateString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let paceStr = "";
  if (run.pace_sec_per_km) {
    const paceMin = Math.floor(run.pace_sec_per_km / 60);
    const paceSec = run.pace_sec_per_km % 60;
    paceStr = `${paceMin}:${String(paceSec).padStart(2, "0")} /km`;
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
      <div className="flex flex-col gap-1">
        <span className="font-medium">
          {dateStr} {timeStr}
        </span>
        <div className="flex gap-3 text-muted-foreground">
          <span>{run.distance_km} km</span>
          {run.duration_min && <span>{run.duration_min} min</span>}
          {paceStr && <span>{paceStr}</span>}
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isDeleting}>
            Smazat
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat běh?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Běh bude trvale odstraněn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Mažu..." : "Smazat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
