"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { copy } from "@/lib/copy";

type QuickJournalModalProps = {
  placeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function QuickJournalModal({
  placeId,
  isOpen,
  onClose,
  onSuccess,
}: QuickJournalModalProps) {
  const router = useRouter();

  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate content
      if (content.trim() === "") {
        setError(copy.journal.quickModal.emptyError);
        setIsSubmitting(false);
        return;
      }

      if (content.trim().length > 2000) {
        setError(copy.journal.quickModal.tooLongError);
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/journal/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          place_id: placeId,
          content: content.trim(),
          visibility,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodařilo se vytvořit záznam");
      }

      // Success
      toast.success(copy.common.saved);
      setContent("");
      setVisibility("private");
      onClose();
      router.refresh();
      onSuccess?.();
    } catch (err: any) {
      console.error("Journal create error:", err);
      const errorMessage = err.message || "Uložení se nepovedlo";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{copy.journal.quickModal.title}</DialogTitle>
              <DialogDescription>
                {copy.journal.quickModal.description}
              </DialogDescription>
            </DialogHeader>

            {/* Content */}
            <div className="space-y-2">
              <label
                htmlFor="content"
                className="text-sm font-medium text-foreground"
              >
                {copy.journal.quickModal.contentLabel}
              </label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={copy.journal.quickModal.contentPlaceholder}
                rows={6}
                disabled={isSubmitting}
                className="resize-y"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {copy.journal.quickModal.charCount(content.trim().length)}
                </p>
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {copy.journal.quickModal.visibilityLabel}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                    disabled={isSubmitting}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">
                    <strong>{copy.journal.quickModal.visibilityPrivate}</strong> - {copy.journal.quickModal.visibilityPrivateDesc}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                    disabled={isSubmitting}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">
                    <strong>{copy.journal.quickModal.visibilityPublic}</strong> - {copy.journal.quickModal.visibilityPublicDesc}
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {copy.common.cancel}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || content.trim() === ""}
              >
                {isSubmitting ? copy.common.saving : copy.journal.quickModal.save}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
