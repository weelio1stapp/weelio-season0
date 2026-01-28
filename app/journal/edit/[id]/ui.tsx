"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Card from "@/components/Card";

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
      router.push("/me");
      router.refresh();
    } catch (err: any) {
      console.error("Journal update error:", err);
      setError(err.message || "Došlo k neočekávané chybě");
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Content */}
        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-[var(--text-primary)] mb-2"
          >
            Obsah záznamu
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Napiš sem svůj zážitek, myšlenku nebo poznámku..."
            rows={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-vertical"
            disabled={isSubmitting}
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {content.trim().length} / 2000 znaků
          </p>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
            Viditelnost
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === "private"}
                onChange={(e) => setVisibility("private")}
                disabled={isSubmitting}
                className="w-4 h-4 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
              />
              <span className="text-sm">
                <strong>Soukromý</strong> - Vidíš jen ty
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === "public"}
                onChange={(e) => setVisibility("public")}
                disabled={isSubmitting}
                className="w-4 h-4 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
              />
              <span className="text-sm">
                <strong>Veřejný</strong> - Uvidí všichni návštěvníci místa
              </span>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
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
