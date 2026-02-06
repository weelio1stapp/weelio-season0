"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  targetType: "place_photo" | "place_media" | "journal_entry" | "riddle";
  targetId: string;
  targetLabel?: string; // Optional label for better UX (e.g., "tuto fotku", "tento zápis")
};

export default function ReportDialog({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetLabel = "tento obsah",
}: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate reason
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      toast.error("Důvod musí mít alespoň 5 znaků");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/moderation/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason: trimmedReason,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodařilo se nahlásit");
      }

      toast.success("Report odeslán. Děkujeme za upozornění!");
      setReason("");
      onClose();
    } catch (error: any) {
      console.error("Report error:", error);
      toast.error(error.message || "Nepodařilo se nahlásit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setReason("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nahlásit nevhodný obsah</DialogTitle>
          <DialogDescription>
            Nahlašujete {targetLabel}. Popište prosím důvod (alespoň 5 znaků).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Důvod nahlášení</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Např: Nevhodné slovo, spam, osobní údaje..."
              rows={4}
              disabled={submitting}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {reason.trim().length} / 5 znaků minimum
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Zrušit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || reason.trim().length < 5}
          >
            {submitting ? "Odesílám..." : "Nahlásit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
