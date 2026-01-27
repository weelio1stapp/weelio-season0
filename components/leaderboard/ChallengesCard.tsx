import type { Season, Challenge, ChallengeProgress } from "@/lib/db/challenges";

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
    <div className="bg-white rounded-lg shadow-[var(--shadow-md)] overflow-hidden">
      <div className="p-6">
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
            <div className="inline-block px-4 py-2 bg-gray-100 rounded-full">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                🚧 Žádné aktivní výzvy
              </span>
            </div>
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
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {/* Challenge Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        {challenge.title}
                      </h3>
                      {challenge.description && (
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                          {challenge.description}
                        </p>
                      )}
                    </div>
                    {isAuthenticated && isCompleted && (
                      <span className="flex-shrink-0 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        ✓ Splněno
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  {isAuthenticated ? (
                    <div className="mt-3">
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isCompleted
                              ? "bg-green-500"
                              : "bg-[var(--accent-primary)]"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {/* Progress Text */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--text-secondary)]">
                          {current} / {target}
                        </span>
                        <span className="text-xs font-medium text-[var(--accent-primary)]">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-center">
                      <span className="text-xs text-[var(--text-secondary)] italic">
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
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-sm text-blue-700">
              🔐 Přihlas se pro sledování svého progressu
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
