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
import { FileText, Camera, Mic, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Nahraj pouze obrázky (JPG, PNG, atd.)");
      return;
    }

    // Validate file size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Obrázek je příliš velký (max 8 MB)");
      return;
    }

    setUploadError(null);
    setPhotoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUploadError(null);

    try {
      let photoPath: string | null = null;

      // Handle photo upload if in photo mode
      if (activeTab === "photo") {
        if (!photoFile) {
          setUploadError("Vyber fotku");
          setIsSubmitting(false);
          return;
        }

        const supabase = getSupabaseBrowserClient();

        // Generate unique filename
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const storagePath = `places/${placeId}/visits/${user?.id}/${today}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("place-media")
          .upload(storagePath, photoFile);

        if (uploadError) {
          console.error("Photo upload error:", uploadError);
          throw new Error("Nepodařilo se nahrát fotku");
        }

        photoPath = storagePath;
      }

      // Call visit API
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId,
          source: "manual",
          note: activeTab === "note" ? noteText.trim() || null : null,
          photo_path: photoPath,
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

        // If we uploaded a photo but visit was duplicate, try to clean up
        if (photoPath) {
          const supabase = getSupabaseBrowserClient();
          await supabase.storage.from("place-media").remove([photoPath]);
        }

        // Notify parent component
        onVisitRecorded?.({
          xp_delta: 0,
          visit_id: data.visit_id || "",
          journal_entry_id: null,
          is_duplicate: true,
        });

        onOpenChange(false);
        setNoteText("");
        clearPhoto();
        setActiveTab(defaultTab);
        return;
      }

      // Success - show XP toast
      const xpDelta = data.xp_delta || 0;
      const hasNote = activeTab === "note" && noteText.trim().length > 0;
      const hasPhoto = activeTab === "photo" && photoPath;

      let description = "Tvá stopa byla zanechána";
      if (hasNote) {
        description = "Tvá stopa a poznámka byly zanechány";
      } else if (hasPhoto) {
        description = "Tvá stopa a fotka byly zanechány";
      }

      toast.success(`Návštěva potvrzena! +${xpDelta} XP`, {
        description,
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
      clearPhoto();
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
              <TabsTrigger value="photo" className="gap-2">
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
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Náhled"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={clearPhoto}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                  />
                )}
                {uploadError && (
                  <p className="text-xs text-destructive">{uploadError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Max. velikost: 8 MB • Formáty: JPG, PNG
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
