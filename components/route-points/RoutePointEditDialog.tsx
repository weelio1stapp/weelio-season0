"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoutePoint, RoutePointKind } from "@/lib/db/route-points";

interface RoutePointEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  point: RoutePoint | null;
  routeId: string;
  onSave: (data: {
    kind: RoutePointKind;
    lat: number;
    lng: number;
    title: string;
    note: string;
  }) => Promise<void>;
}

const KIND_LABELS: Record<RoutePointKind, string> = {
  START: "Start",
  END: "Cíl",
  CHECKPOINT: "Checkpoint",
  POI: "Bod zájmu",
  TREASURE: "Poklad",
};

export function RoutePointEditDialog({
  open,
  onOpenChange,
  point,
  routeId,
  onSave,
}: RoutePointEditDialogProps) {
  const isEdit = !!point;
  const isStartOrEnd = point?.kind === "START" || point?.kind === "END";

  const [kind, setKind] = useState<RoutePointKind>("CHECKPOINT");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && point) {
      setKind(point.kind);
      setLat(point.lat.toString());
      setLng(point.lng.toString());
      setTitle(point.title || "");
      setNote(point.note || "");
    } else if (!open) {
      // Reset to defaults when closing
      setKind("CHECKPOINT");
      setLat("");
      setLng("");
      setTitle("");
      setNote("");
    }
  }, [open, point]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onSave({
        kind,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        title,
        note,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving point:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Upravit bod trasy" : "Přidat bod trasy"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Změňte detaily bodu na trase."
              : "Přidejte nový bod na trasu."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Typ bodu */}
            <div className="grid gap-2">
              <Label htmlFor="kind">Typ bodu</Label>
              <Select
                value={kind}
                onValueChange={(value) => setKind(value as RoutePointKind)}
                disabled={isStartOrEnd}
              >
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="START">Start</SelectItem>
                  <SelectItem value="END">Cíl</SelectItem>
                  <SelectItem value="CHECKPOINT">Checkpoint</SelectItem>
                  <SelectItem value="POI">Bod zájmu</SelectItem>
                  <SelectItem value="TREASURE">Poklad</SelectItem>
                </SelectContent>
              </Select>
              {isStartOrEnd && (
                <p className="text-xs text-muted-foreground">
                  Typ START/END nelze změnit
                </p>
              )}
            </div>

            {/* Název */}
            <div className="grid gap-2">
              <Label htmlFor="title">Název</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Např. Rozhledna, Altán..."
              />
            </div>

            {/* Souřadnice */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lat">Zeměpisná šířka</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="49.8175"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lng">Zeměpisná délka</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="18.2625"
                  required
                />
              </div>
            </div>

            {/* Poznámka */}
            <div className="grid gap-2">
              <Label htmlFor="note">Poznámka</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Volitelná poznámka k bodu..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Ukládám..." : isEdit ? "Uložit" : "Přidat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
