import type { Season, Challenge, ChallengeProgress } from "@/lib/db/challenges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";

interface ChallengesCardProps {
  season: Season | null;
  challenges: Challenge[];
  progress: ChallengeProgress[];
  isAuthenticated: boolean;
}

/**
 * Format date range for season
 */
function formatDateRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const formatter = new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export default function ChallengesCard({
  season,
  challenges,
  progress,
  isAuthenticated,
}: ChallengesCardProps) {
  // Create a map for quick progress lookup
  const progressMap = new Map(
    progress.map((p) => [p.challenge_id, p])
  );

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Výzvy a sezóny
        </CardTitle>
        <CardDescription>
          {season
            ? `${season.name} • ${formatDateRange(season.starts_at, season.ends_at)}`
            : "Žádná aktivní sezóna"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              Výzvy a sezóny
            </h2>
            {season ? (
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {season.name} • {formatDateRange(season.starts_at, season.ends_at)}
              </p>
            ) : (
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Žádná aktivní sezóna
              </p>
            )}
          </div>
        </div>

        {/* Challenges List */}
        {challenges.length === 0 ? (
          <div className="py-8 text-center">
            <Badge variant="secondary" className="text-sm">
              🚧 Žádné aktivní výzvy
            </Badge>
          </div>
        ) : (
          <div className="space-y-4">
            {challenges.map((challenge) => {
              const prog = progressMap.get(challenge.id);
              const current = prog?.current ?? 0;
              const target = challenge.target;
              const percentage = Math.min((current / target) * 100, 100);
              const isCompleted = current >= target;

              return (
                <div
                  key={challenge.id}
                  className="p-4 rounded-lg border bg-muted/40"
                >
                  {/* Challenge Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {challenge.title}
                      </h3>
                      {challenge.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {challenge.description}
                        </p>
                      )}
                    </div>
                    {isAuthenticated && isCompleted && (
                      <Badge variant="default" className="bg-green-600">
                        ✓ Splněno
                      </Badge>
                    )}
                  </div>

                  {/* Progress */}
                  {isAuthenticated ? (
                    <div className="mt-3 space-y-2">
                      {/* Progress Bar */}
                      <Progress value={percentage} className="h-2" />
                      {/* Progress Text */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {current} / {target}
                        </span>
                        <span className="text-xs font-medium">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-center">
                      <span className="text-xs text-muted-foreground italic">
                        Cíl: {target}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Not authenticated message */}
        {!isAuthenticated && challenges.length > 0 && (
          <div className="mt-4 p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 text-center">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              🔐 Přihlas se pro sledování svého progressu
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
