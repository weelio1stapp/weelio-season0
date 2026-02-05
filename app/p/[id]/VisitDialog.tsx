"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Camera, Mic } from "lucide-react";

type VisitResult = {
  xp_delta: number;
  visit_id: string;
  journal_entry_id: string | null;
  is_duplicate: boolean;
};

type VisitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeId: string;
  placeName: string;
  onVisitRecorded?: (result: VisitResult) => void;
  defaultTab?: string;
};

export default function VisitDialog({
  open,
  onOpenChange,
  placeId,
  placeName,
  onVisitRecorded,
  defaultTab = "note",
}: VisitDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [noteText, setNoteText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Call visit API with note
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId,
          source: "manual",
          note: noteText.trim() || null,
          mode: activeTab,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodařilo se potvrdit návštěvu");
      }

      // Handle duplicate visit
      if (data.is_duplicate) {
        toast.info("Už jsi tu dnes byl", {
          description: "Můžeš navštívit znovu zítra",
        });

        // Notify parent component
        onVisitRecorded?.({
          xp_delta: 0,
          visit_id: data.visit_id || "",
          journal_entry_id: null,
          is_duplicate: true,
        });

        onOpenChange(false);
        setNoteText("");
        setActiveTab(defaultTab);
        return;
      }

      // Success - show XP toast
      const xpDelta = data.xp_delta || 0;
      const hasNote = noteText.trim().length > 0;

      toast.success(`Návštěva potvrzena! +${xpDelta} XP`, {
        description: hasNote
          ? "Tvá stopa a poznámka byly zanechány"
          : "Tvá stopa byla zanechána",
      });

      // Notify parent component
      onVisitRecorded?.({
        xp_delta: xpDelta,
        visit_id: data.visit_id || "",
        journal_entry_id: data.journal_entry_id || null,
        is_duplicate: false,
      });

      // Close dialog
      onOpenChange(false);

      // Reset form
      setNoteText("");
      setActiveTab(defaultTab);

      // Refresh page data
      router.refresh();
    } catch (err: any) {
      console.error("Visit confirmation error:", err);
      toast.error(err.message || "Nastala chyba při potvrzování návštěvy");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Potvrď návštěvu</DialogTitle>
          <DialogDescription>
            Stačí zanechat malou stopu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="note" className="gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Poznámka</span>
              </TabsTrigger>
              <TabsTrigger value="photo" className="gap-2" disabled>
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Fotka</span>
              </TabsTrigger>
              <TabsTrigger value="audio" className="gap-2" disabled>
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline">Audio</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="note" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="note">Jaké to tu je?</Label>
                <Textarea
                  id="note"
                  placeholder="Pár slov o tom, jak to tu vypadá, co jsi viděl..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Poznámka je nepovinná, ale pomůže ostatním dobrodruhům
                </p>
              </div>
            </TabsContent>

            <TabsContent value="photo" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="photo">Nahraj fotku</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Funkce fotky bude brzy k dispozici
                </p>
              </div>
            </TabsContent>

            <TabsContent value="audio" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="audio">Nahraj audio</Label>
                <Input
                  id="audio"
                  type="file"
                  accept="audio/*"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Funkce audio bude brzy k dispozici
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Potvrzuji..." : "Potvrdit návštěvu"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
