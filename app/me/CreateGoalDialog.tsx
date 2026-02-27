"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMyRunGoal } from "./actions";
import { toast } from "sonner";

type CreateGoalDialogProps = {
  triggerLabel?: string;
  existingGoal?: {
    period_start: string;
    period_end: string;
    target_distance_km: number;
    target_runs: number;
    plan_total_runs: number;
  };
};

export default function CreateGoalDialog({
  triggerLabel = "Vytvořit cíl",
  existingGoal,
}: CreateGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Default dates: current month (if no existing goal)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const defaultStart = existingGoal?.period_start || firstDay.toISOString().split("T")[0];
  const defaultEnd = existingGoal?.period_end || lastDay.toISOString().split("T")[0];
  const defaultDistance = existingGoal?.target_distance_km || 200;
  const defaultRuns = existingGoal?.target_runs || 24;
  const defaultPlanRuns = existingGoal?.plan_total_runs || 24;

  const isEditing = !!existingGoal;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const result = await createMyRunGoal(formData);
    setLoading(false);

    if (result.success) {
      toast.success(isEditing ? "Cíl aktualizován" : "Cíl vytvořen");
      setOpen(false);
      e.currentTarget.reset();
    } else {
      toast.error(result.error || "Chyba při ukládání cíle");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEditing ? "outline" : "default"}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Změnit běžecký cíl" : "Vytvořit běžecký cíl"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Uprav parametry svého cíle pro Projekt Krysa 🐀"
              : "Nastav si měsíční cíl pro Projekt Krysa 🐀"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="period_start">Začátek období</Label>
            <Input
              id="period_start"
              name="period_start"
              type="date"
              required
              defaultValue={defaultStart}
            />
          </div>
          <div>
            <Label htmlFor="period_end">Konec období</Label>
            <Input
              id="period_end"
              name="period_end"
              type="date"
              required
              defaultValue={defaultEnd}
            />
          </div>
          <div>
            <Label htmlFor="target_distance_km">Cílová vzdálenost (km)</Label>
            <Input
              id="target_distance_km"
              name="target_distance_km"
              type="number"
              step="0.1"
              min="0.1"
              max="1000"
              required
              defaultValue={defaultDistance}
            />
          </div>
          <div>
            <Label htmlFor="target_runs">Cílový počet běhů</Label>
            <Input
              id="target_runs"
              name="target_runs"
              type="number"
              min="1"
              max="200"
              required
              defaultValue={defaultRuns}
            />
          </div>
          <div>
            <Label htmlFor="plan_total_runs">
              Plánované tréninky (dle rozvrhu)
            </Label>
            <Input
              id="plan_total_runs"
              name="plan_total_runs"
              type="number"
              min="1"
              max="200"
              required
              defaultValue={defaultPlanRuns}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Např. 6 týdně × 4 týdny = 24 tréninků
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Ukládám..." : isEditing ? "Uložit změny" : "Vytvořit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
