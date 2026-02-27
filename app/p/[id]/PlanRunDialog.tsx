"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPlannedRunForPlace } from "./planActions";

type PlanRunDialogProps = {
  placeId: string;
};

export default function PlanRunDialog({ placeId }: PlanRunDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Default planned_at to now + 30 minutes, rounded
  const getDefaultPlannedAt = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    now.setSeconds(0, 0);
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createPlannedRunForPlace(formData);

    setIsSubmitting(false);

    if (result.success) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error || "Chyba při ukládání");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Naplánovat běh</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Naplánovat běh</DialogTitle>
          <DialogDescription>
            Vytvoř plán na budoucí běh. Později ho můžeš označit jako splněný.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="place_id" value={placeId} />

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="planned_at">Plánované datum a čas</Label>
              <Input
                id="planned_at"
                name="planned_at"
                type="datetime-local"
                defaultValue={getDefaultPlannedAt()}
                required
              />
            </div>

            <div>
              <Label htmlFor="distance_km">Vzdálenost (km)</Label>
              <Input
                id="distance_km"
                name="distance_km"
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                placeholder="5.0"
                required
              />
            </div>

            <div>
              <Label htmlFor="target_duration_min">
                Cílový čas (minuty, volitelné)
              </Label>
              <Input
                id="target_duration_min"
                name="target_duration_min"
                type="number"
                min="1"
                max="1000"
                placeholder="30"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Ukládám..." : "Vytvořit plán"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
