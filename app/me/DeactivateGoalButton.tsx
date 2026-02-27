"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { deactivateMyActiveRunGoal } from "./actions";
import { toast } from "sonner";

export default function DeactivateGoalButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDeactivate() {
    setLoading(true);

    const result = await deactivateMyActiveRunGoal();
    setLoading(false);

    if (result.success) {
      toast.success("Cíl ukončen");
      setOpen(false);
    } else {
      toast.error(result.error || "Chyba při ukončování cíle");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Ukončit cíl
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ukončit běžecký cíl?</AlertDialogTitle>
          <AlertDialogDescription>
            Tato akce deaktivuje tvůj aktuální cíl. Progres zůstane uložen, ale
            cíl už nebude aktivní. Můžeš si kdykoliv vytvořit nový cíl.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeactivate} disabled={loading}>
            {loading ? "Ukončuji..." : "Ukončit cíl"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
