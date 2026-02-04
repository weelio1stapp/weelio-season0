"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import CreateRiddleModal from "./CreateRiddleModal";
import { copy } from "@/lib/copy";

type Riddle = {
  id: string;
  prompt: string;
  answer_type: "text" | "number";
  xp_reward: number;
  max_attempts?: number;
  cooldown_hours?: number;
  attempts_left?: number;
  solved?: boolean;
  can_delete?: boolean;
  next_available_at?: string | null;
};

// Helper to format time remaining until next_available_at
function formatTimeRemaining(nextAvailableAt: string | null): string {
  if (!nextAvailableAt) return "";

  const now = new Date();
  const next = new Date(nextAvailableAt);
  const diffMs = next.getTime() - now.getTime();

  if (diffMs <= 0) return "nyní";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

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
  // Use useState to allow immediate updates after actions
  const [riddles, setRiddles] = useState<Riddle[]>(initialRiddles);
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

  // Refetch riddles status from backend (source of truth)
  const refetchStatus = async () => {
    try {
      const response = await fetch("/api/riddles/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId }),
      });
      const data = await response.json();
      if (data.ok && data.riddles) {
        setRiddles(data.riddles);
      }
    } catch (err) {
      console.error("Refetch status error:", err);
    }
  };

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
        const errorMsg = data.error || "Nepodařilo se smazat kešku";
        const details = data.details ? ` (${data.details})` : "";
        toast.error(errorMsg + details);
        setDeleting({ ...deleting, [riddleId]: false });
        return;
      }

      // Optimistically remove riddle from local state
      setRiddles((prev) => prev.filter((r) => r.id !== riddleId));

      // Refetch to ensure consistency with backend
      await refetchStatus();

      toast.success("Keška smazána");
    } catch (err: any) {
      console.error("Riddle delete error:", err);
      toast.error(err.message || "Nepodařilo se smazat kešku");
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

      // Refetch status after every attempt to update attempts_left and solved state
      await refetchStatus();

      // Handle cooldown error
      if (data.error === "Cooldown" && data.next_available_at) {
        const timeLeft = formatTimeRemaining(data.next_available_at);
        toast.info(`Už splněno, znovu za ${timeLeft}`);
        setFeedback({
          ...feedback,
          [riddleId]: {
            type: "success",
            message: `Už máš vyřešeno. Znovu za ${timeLeft}`,
          },
        });
        return;
      }

      if (data.correct) {
        // Correct answer!
        solvedSet.add(riddleId);

        // Show different message if already solved (xp_delta=0)
        const message = data.already_solved
          ? "Už máš vyřešeno"
          : copy.riddles.correctWithXp(data.xp_delta);

        setFeedback({
          ...feedback,
          [riddleId]: {
            type: "success",
            message: message,
            xp: data.xp_delta,
          },
        });
        setAnswers({ ...answers, [riddleId]: "" });

        // Refresh page to update XP in header if XP was awarded
        if (data.xp_delta > 0) {
          setTimeout(() => {
            router.refresh();
          }, 1500);
        }
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
                    <Alert variant="success">
                      <AlertDescription className="font-medium">
                        ✅ {copy.riddles.solved}
                      </AlertDescription>
                      {riddle.next_available_at && (
                        <p className="text-xs mt-1 opacity-90">
                          Znovu za: {formatTimeRemaining(riddle.next_available_at)}
                        </p>
                      )}
                    </Alert>
                  ) : attemptsLeft === 0 ? (
                    <Alert variant="error">
                      <AlertDescription className="font-medium">
                        {copy.riddles.noAttemptsLeft}
                      </AlertDescription>
                    </Alert>
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
                        <Alert variant={riddleFeedback.type === "success" ? "success" : "error"}>
                          <AlertDescription className="font-medium">
                            {riddleFeedback.message}
                          </AlertDescription>
                        </Alert>
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
            refetchStatus();
          }}
        />
      )}
    </Card>
    </section>
  );
}
