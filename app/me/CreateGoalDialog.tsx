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

export default function CreateGoalDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Default dates: current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const defaultStart = firstDay.toISOString().split("T")[0];
  const defaultEnd = lastDay.toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const result = await createMyRunGoal(formData);
    setLoading(false);

    if (result.success) {
      toast.success("Cíl vytvořen");
      setOpen(false);
      e.currentTarget.reset();
    } else {
      toast.error(result.error || "Chyba při vytváření cíle");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Vytvořit cíl</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vytvořit běžecký cíl</DialogTitle>
          <DialogDescription>
            Nastav si měsíční cíl pro Projekt Krysa 🐀
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
              defaultValue="200"
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
              defaultValue="24"
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
              defaultValue="24"
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
              {loading ? "Vytvářím..." : "Vytvořit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
