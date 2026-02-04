"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CreateRiddleModal from "./CreateRiddleModal";
import { copy } from "@/lib/copy";

type Riddle = {
  id: string;
  prompt: string;
  answer_type: "text" | "number";
  xp_reward: number;
  max_attempts?: number;
  attempts_left?: number;
  solved?: boolean;
  can_delete?: boolean;
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
  // Use props directly instead of useState to allow refresh after create
  const riddles = initialRiddles;
  const solvedSet = new Set(initialSolved);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<
    Record<
      string,
      { type: "success" | "error"; message: string; xp?: number } | null
    >
  >({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleDelete = async (riddleId: string) => {
    if (!confirm("Opravdu chceš smazat tuto kešku?")) {
      return;
    }

    setDeleting({ ...deleting, [riddleId]: true });

    try {
      const response = await fetch("/api/riddles/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ riddle_id: riddleId }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodařilo se smazat kešku");
      }

      // Refresh to remove deleted riddle
      router.refresh();
    } catch (err: any) {
      console.error("Riddle delete error:", err);
      alert(err.message || "Nepodařilo se smazat kešku");
    } finally {
      setDeleting({ ...deleting, [riddleId]: false });
    }
  };

  const handleAttempt = async (riddleId: string, riddleType: string) => {
    const answer = answers[riddleId]?.trim();
    if (!answer) {
      setFeedback({
        ...feedback,
        [riddleId]: { type: "error", message: copy.riddles.emptyAnswer },
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
        throw new Error(data.error || copy.riddles.verifyFailed);
      }

      if (data.correct) {
        // Correct answer!
        solvedSet.add(riddleId);
        setFeedback({
          ...feedback,
          [riddleId]: {
            type: "success",
            message: copy.riddles.correctWithXp(data.xp_delta),
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
            ? copy.riddles.noAttemptsLeft
            : `Zbývá ${data.attempts_left} ${
                data.attempts_left === 1
                  ? copy.riddles.attempts.singular
                  : data.attempts_left < 5
                  ? copy.riddles.attempts.few
                  : copy.riddles.attempts.many
              }`;

        setFeedback({
          ...feedback,
          [riddleId]: {
            type: "error",
            message: `${copy.riddles.incorrect}. ${attemptsText}`,
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
      <section id="place-riddles" className="scroll-mt-24">
        <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">{copy.riddles.titleOnPlace}</CardTitle>
          <CardDescription>{copy.riddles.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg bg-muted/40">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <KeyRound className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-center mb-1">
              {copy.riddles.loginPrompt}
            </p>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {copy.riddles.loginDesc}
            </p>
            <Button variant="outline" asChild>
              <Link href="/leaderboard">{copy.common.login}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      </section>
    );
  }

  return (
    <section id="place-riddles" className="scroll-mt-24">
      <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{copy.riddles.titleOnPlace}</CardTitle>
            <CardDescription>
              {copy.riddles.description}
            </CardDescription>
          </div>
          {isPlaceAuthor && (
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              {copy.riddles.addRiddle}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>

        {riddles.length > 0 ? (
          <div className="space-y-4">
            {riddles.map((riddle) => {
              const isSolved = riddle.solved ?? solvedSet.has(riddle.id);
              const isSubmitting = submitting[riddle.id] || false;
              const isDeleting = deleting[riddle.id] || false;
              const riddleFeedback = feedback[riddle.id];
              const maxAttempts = riddle.max_attempts ?? 3;
              const attemptsLeft = riddle.attempts_left ?? maxAttempts;

              return (
                <div
                  key={riddle.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  {/* Prompt + Actions */}
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm flex-1">
                      {riddle.prompt}
                    </p>
                    <div className="flex items-center gap-2 ml-3">
                      <Badge variant="secondary">
                        +{riddle.xp_reward} XP
                      </Badge>
                      {riddle.can_delete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(riddle.id)}
                          disabled={isDeleting}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Attempts Info */}
                  {!isSolved && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Zbývá {attemptsLeft} z {maxAttempts} pokusů
                    </p>
                  )}

                  {/* Input + Submit */}
                  {isSolved ? (
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                        {copy.riddles.solved}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
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
                              ? copy.riddles.inputPlaceholderNumber
                              : copy.riddles.inputPlaceholderText
                          }
                          disabled={isSubmitting}
                          className="flex-1"
                        />
                        <Button
                          onClick={() =>
                            handleAttempt(riddle.id, riddle.answer_type)
                          }
                          disabled={isSubmitting}
                          size="sm"
                        >
                          {isSubmitting ? "..." : copy.riddles.submitButton}
                        </Button>
                      </div>

                      {/* Feedback */}
                      {riddleFeedback && (
                        <div
                          className={`p-3 rounded-lg border ${
                            riddleFeedback.type === "success"
                              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                          }`}
                        >
                          <p
                            className={`text-sm font-medium ${
                              riddleFeedback.type === "success"
                                ? "text-green-700 dark:text-green-400"
                                : "text-red-700 dark:text-red-400"
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
          <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg bg-muted/40">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <KeyRound className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-center mb-1">
              Zatím tu nejsou žádné kešky.
            </p>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Autor místa může přidat hádanku a odměnu XP.
            </p>
            {isPlaceAuthor ? (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                Přidat kešku
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Máš nápad na kešku? Navrhni ji autorovi místa.
              </p>
            )}
          </div>
        )}

      </CardContent>

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
    </Card>
    </section>
  );
}
