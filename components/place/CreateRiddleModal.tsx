"use client";

import { useState } from "react";
import Button from "@/components/Button";

type CreateRiddleModalProps = {
  placeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateRiddleModal({
  placeId,
  isOpen,
  onClose,
  onSuccess,
}: CreateRiddleModalProps) {
  const [prompt, setPrompt] = useState("");
  const [answerType, setAnswerType] = useState<"text" | "number">("text");
  const [answerPlain, setAnswerPlain] = useState("");
  const [xpReward, setXpReward] = useState(15);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate inputs
      if (prompt.trim() === "") {
        setError("Zadej instrukce/otázku");
        setIsSubmitting(false);
        return;
      }

      if (answerPlain.trim() === "") {
        setError("Zadej správnou odpověď");
        setIsSubmitting(false);
        return;
      }

      if (xpReward < 1 || xpReward > 100) {
        setError("XP musí být mezi 1 a 100");
        setIsSubmitting(false);
        return;
      }

      if (maxAttempts < 1 || maxAttempts > 4) {
        setError("Počet pokusů musí být mezi 1 a 4");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/riddles/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          place_id: placeId,
          prompt: prompt.trim(),
          answer_type: answerType,
          answer_plain: answerPlain.trim(),
          xp_reward: xpReward,
          max_attempts: maxAttempts,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodařilo se vytvořit kešku");
      }

      // Success
      setPrompt("");
      setAnswerType("text");
      setAnswerPlain("");
      setXpReward(15);
      setMaxAttempts(3);
      onSuccess();
    } catch (err: any) {
      console.error("Riddle create error:", err);
      setError(err.message || "Došlo k neočekávané chybě");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            Přidat kešku
          </h3>

          {/* Prompt */}
          <div>
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-[var(--text-primary)] mb-2"
            >
              Instrukce / Otázka
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Např: Kolik schodů vede k vyhlídce?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-vertical"
              disabled={isSubmitting}
            />
          </div>

          {/* Answer Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Typ odpovědi
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="answer_type"
                  value="text"
                  checked={answerType === "text"}
                  onChange={(e) => setAnswerType("text")}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
                <span className="text-sm">Text</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="answer_type"
                  value="number"
                  checked={answerType === "number"}
                  onChange={(e) => setAnswerType("number")}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
                <span className="text-sm">Číslo</span>
              </label>
            </div>
          </div>

          {/* Answer */}
          <div>
            <label
              htmlFor="answer"
              className="block text-sm font-medium text-[var(--text-primary)] mb-2"
            >
              Správná odpověď
            </label>
            <input
              type={answerType === "number" ? "number" : "text"}
              id="answer"
              value={answerPlain}
              onChange={(e) => setAnswerPlain(e.target.value)}
              placeholder={
                answerType === "number" ? "Např: 42" : "Např: slunce"
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
              disabled={isSubmitting}
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {answerType === "text"
                ? "Textové odpovědi jsou case-insensitive"
                : "Musí přesně odpovídat číslu"}
            </p>
          </div>

          {/* Max Attempts */}
          <div>
            <label
              htmlFor="max_attempts"
              className="block text-sm font-medium text-[var(--text-primary)] mb-2"
            >
              Počet pokusů
            </label>
            <input
              type="number"
              id="max_attempts"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(parseInt(e.target.value))}
              min={1}
              max={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
              disabled={isSubmitting}
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Kolik pokusů má uživatel na vyřešení (1-4)
            </p>
          </div>

          {/* XP Reward */}
          <div>
            <label
              htmlFor="xp_reward"
              className="block text-sm font-medium text-[var(--text-primary)] mb-2"
            >
              Odměna XP
            </label>
            <input
              type="number"
              id="xp_reward"
              value={xpReward}
              onChange={(e) => setXpReward(parseInt(e.target.value))}
              min={1}
              max={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
              disabled={isSubmitting}
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Doporučeno 15-30 XP dle obtížnosti
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Vytvářím..." : "Vytvořit kešku"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Zrušit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
