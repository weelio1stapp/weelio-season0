"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { createRunForPlace } from "./actions";
import { toast } from "sonner";

/**
 * Convert Date to datetime-local input format: "YYYY-MM-DDTHH:mm"
 */
function toDatetimeLocalValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function RecordRunDialog({
  placeId,
  isAuthenticated,
}: {
  placeId: string;
  isAuthenticated: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const defaultRanAt = toDatetimeLocalValue(new Date());

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Musíš být přihlášený");
      router.push("/login");
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const result = await createRunForPlace(formData);
    setLoading(false);

    if (result.success) {
      toast.success("Běh uložen");
      setOpen(false);
      e.currentTarget.reset();
    } else {
      toast.error(result.error || "Chyba při ukládání");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Zapsat běh</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zapsat běh</DialogTitle>
          <DialogDescription>
            Zaznamenej svůj běh na této trase.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="place_id" value={placeId} />
          <div>
            <Label htmlFor="distance_km">Vzdálenost (km) *</Label>
            <Input
              id="distance_km"
              name="distance_km"
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              required
              placeholder="5.0"
            />
          </div>
          <div>
            <Label htmlFor="duration_min">Čas (min)</Label>
            <Input
              id="duration_min"
              name="duration_min"
              type="number"
              step="1"
              min="1"
              max="1000"
              placeholder="30"
            />
          </div>
          <div>
            <Label htmlFor="ran_at">Kdy (datum a čas)</Label>
            <Input
              id="ran_at"
              name="ran_at"
              type="datetime-local"
              defaultValue={defaultRanAt}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Ukládám..." : "Uložit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
