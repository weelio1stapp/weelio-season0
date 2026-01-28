"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import CreateRiddleModal from "./CreateRiddleModal";

type Riddle = {
  id: string;
  prompt: string;
  answer_type: "text" | "number";
  xp_reward: number;
};

type PlaceRiddlesProps = {
  placeId: string;
  riddles: Riddle[];
  solvedRiddleIds: string[];
  isAuthenticated: boolean;
  isPlaceAuthor: boolean;
};

export default function PlaceRiddles({
  placeId,
  riddles: initialRiddles,
  solvedRiddleIds: initialSolved,
  isAuthenticated,
  isPlaceAuthor,
}: PlaceRiddlesProps) {
  const router = useRouter();
  const [riddles] = useState<Riddle[]>(initialRiddles);
  const [solvedSet] = useState<Set<string>>(new Set(initialSolved));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<
    Record<
      string,
      { type: "success" | "error"; message: string; xp?: number } | null
    >
  >({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleAttempt = async (riddleId: string, riddleType: string) => {
    const answer = answers[riddleId]?.trim();
    if (!answer) {
      setFeedback({
        ...feedback,
        [riddleId]: { type: "error", message: "Zadej odpověď" },
      });
      return;
    }

    setSubmitting({ ...submitting, [riddleId]: true });
    setFeedback({ ...feedback, [riddleId]: null });

    try {
      const response = await fetch("/api/riddles/attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          riddle_id: riddleId,
          answer_plain: answer,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodařilo se ověřit odpověď");
      }

      if (data.correct) {
        // Correct answer!
        solvedSet.add(riddleId);
        setFeedback({
          ...feedback,
          [riddleId]: {
            type: "success",
            message: `Správně! +${data.xp_delta} XP`,
            xp: data.xp_delta,
          },
        });
        setAnswers({ ...answers, [riddleId]: "" });

        // Refresh to update XP in header/profile
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        // Incorrect
        const attemptsText =
          data.attempts_left === 0
            ? "Dnes už žádné pokusy"
            : `Zbývá ${data.attempts_left} ${
                data.attempts_left === 1
                  ? "pokus"
                  : data.attempts_left < 5
                  ? "pokusy"
                  : "pokusů"
              }`;

        setFeedback({
          ...feedback,
          [riddleId]: {
            type: "error",
            message: `Špatně. ${attemptsText}`,
          },
        });
      }
    } catch (err: any) {
      console.error("Riddle attempt error:", err);
      setFeedback({
        ...feedback,
        [riddleId]: { type: "error", message: err.message },
      });
    } finally {
      setSubmitting({ ...submitting, [riddleId]: false });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mt-6 rounded-2xl border p-6">
        <h3 className="text-base font-semibold mb-4">Kešky na místě</h3>
        <p className="text-sm text-[var(--text-secondary)] text-center py-4">
          Přihlaš se, abys mohl řešit kešky a získat XP
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Kešky na místě</h3>
        {isPlaceAuthor && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            Přidat kešku
          </button>
        )}
      </div>

      {/* Riddles List */}
      {riddles.length > 0 ? (
        <div className="space-y-4">
          {riddles.map((riddle) => {
            const isSolved = solvedSet.has(riddle.id);
            const isSubmitting = submitting[riddle.id] || false;
            const riddleFeedback = feedback[riddle.id];

            return (
              <div
                key={riddle.id}
                className="p-4 rounded-lg border border-gray-200"
              >
                {/* Prompt */}
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-[var(--text-primary)] flex-1">
                    {riddle.prompt}
                  </p>
                  <span className="ml-3 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                    +{riddle.xp_reward} XP
                  </span>
                </div>

                {/* Input + Submit */}
                {isSolved ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      ✅ Splněno
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type={riddle.answer_type === "number" ? "number" : "text"}
                        value={answers[riddle.id] || ""}
                        onChange={(e) =>
                          setAnswers({
                            ...answers,
                            [riddle.id]: e.target.value,
                          })
                        }
                        placeholder={
                          riddle.answer_type === "number"
                            ? "Zadej číslo..."
                            : "Zadej odpověď..."
                        }
                        disabled={isSubmitting}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm"
                      />
                      <Button
                        variant="primary"
                        onClick={() =>
                          handleAttempt(riddle.id, riddle.answer_type)
                        }
                        disabled={isSubmitting}
                        className="text-sm px-4 py-2"
                      >
                        {isSubmitting ? "..." : "Zkusit"}
                      </Button>
                    </div>

                    {/* Feedback */}
                    {riddleFeedback && (
                      <div
                        className={`p-3 rounded-lg border ${
                          riddleFeedback.type === "success"
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            riddleFeedback.type === "success"
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {riddleFeedback.message}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Zatím žádné kešky na tomto místě.
          </p>
          {isPlaceAuthor && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-block px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              Přidat první kešku
            </button>
          )}
        </div>
      )}

      {/* Create Modal */}
      {isPlaceAuthor && (
        <CreateRiddleModal
          placeId={placeId}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
