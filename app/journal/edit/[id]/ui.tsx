"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Card from "@/components/Card";
import { copy } from "@/lib/copy";

type JournalEditFormProps = {
  id: string;
  content: string;
  visibility: "private" | "public";
  placeId: string | null;
};

export default function JournalEditForm({
  id,
  content: initialContent,
  visibility: initialVisibility,
}: JournalEditFormProps) {
  const router = useRouter();

  const [content, setContent] = useState(initialContent);
  const [visibility, setVisibility] = useState<"private" | "public">(
    initialVisibility
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate content
      if (content.trim() === "") {
        setError("Obsah nesmí být prázdný");
        setIsSubmitting(false);
        return;
      }

      if (content.trim().length > 2000) {
        setError("Obsah je příliš dlouhý (maximum 2000 znaků)");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/journal/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          content: content.trim(),
          visibility,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodařilo se aktualizovat záznam");
      }

      // Success - redirect to /me
      toast.success(copy.common.saved);
      router.push("/me");
      router.refresh();
    } catch (err: any) {
      console.error("Journal update error:", err);
      const errorMessage = err.message || "Uložení se nepovedlo";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content">Obsah záznamu</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Napiš sem svůj zážitek, myšlenku nebo poznámku..."
            rows={8}
            disabled={isSubmitting}
            className="resize-y"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {content.trim().length} / 2000 znaků
            </p>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        {/* Visibility */}
        <div className="space-y-3">
          <Label>Viditelnost</Label>
          <RadioGroup
            value={visibility}
            onValueChange={(value) => setVisibility(value as "private" | "public")}
            disabled={isSubmitting}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="private" id="private" />
              <Label htmlFor="private" className="font-normal cursor-pointer">
                <strong>Soukromý</strong> - Vidíš jen ty
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="public" id="public" />
              <Label htmlFor="public" className="font-normal cursor-pointer">
                <strong>Veřejný</strong> - Uvidí všichni návštěvníci místa
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || content.trim() === ""}
            className="flex-1"
          >
            {isSubmitting ? "Ukládám..." : "Uložit změny"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/me")}
            disabled={isSubmitting}
          >
            Zrušit
          </Button>
        </div>
      </form>
    </Card>
  );
}
