import Link from "next/link";
import { PLACE_TYPE_LABELS, PlaceType } from "@/lib/constants/placeTypes";
import type { ChallengeProgress, Challenge } from "@/lib/db/challenges";

type NearbyPlace = {
  id: string;
  name: string;
  type: PlaceType;
  area: string;
  cover_public_url: string | null;
};

type UserRankData = {
  walkerRank: string;
  authorRank: string;
};

type NextStepsSectionProps = {
  nearbyPlaces: NearbyPlace[];
  challenges: Challenge[];
  challengeProgress: ChallengeProgress[];
  userRanks: UserRankData | null;
  isAuthenticated: boolean;
};

export default function NextStepsSection({
  nearbyPlaces,
  challenges,
  challengeProgress,
  userRanks,
  isAuthenticated,
}: NextStepsSectionProps) {
  // Create progress map for quick lookup
  const progressMap = new Map(
    challengeProgress.map((p) => [p.challenge_id, p])
  );

  // Get closest challenges (sorted by remaining tasks)
  const challengesWithProgress = challenges
    .map((challenge) => {
      const prog = progressMap.get(challenge.id);
      const current = prog?.current ?? 0;
      const remaining = challenge.target - current;
      const isCompleted = current >= challenge.target;
      return {
        ...challenge,
        current,
        remaining,
        isCompleted,
      };
    })
    .sort((a, b) => {
      // Completed challenges go last
      if (a.isCompleted && !b.isCompleted) return 1;
      if (!a.isCompleted && b.isCompleted) return -1;
      // Sort by remaining (closest to completion first)
      return a.remaining - b.remaining;
    })
    .slice(0, 2); // Take top 2

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
        Co dál?
      </h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Pokračuj v okolí */}
        <div className="rounded-2xl border p-6 bg-white">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            🗺️ Pokračuj v okolí
          </h3>

          {nearbyPlaces.length > 0 ? (
            <div className="space-y-3">
              {nearbyPlaces.map((place) => (
                <Link
                  key={place.id}
                  href={`/p/${place.id}`}
                  className="block p-3 rounded-lg border border-gray-200 hover:border-[var(--accent-primary)] hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {place.cover_public_url && (
                      <img
                        src={place.cover_public_url}
                        alt={place.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[var(--text-primary)] truncate">
                        {place.name}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {PLACE_TYPE_LABELS[place.type]}
                      </p>
                    </div>
                    <span className="text-[var(--accent-primary)] text-sm">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              Zatím nejsou další místa v této oblasti.
            </p>
          )}
        </div>

        {/* Card 2: Plníš výzvy */}
        <div className="rounded-2xl border p-6 bg-white">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            🏆 Plníš výzvy (Sezóna 0)
          </h3>

          {!isAuthenticated ? (
            <div className="text-center py-4">
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Přihlas se pro sledování svého progressu
              </p>
              <Link
                href="/leaderboard"
                className="inline-block px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Zobrazit výzvy
              </Link>
            </div>
          ) : challenges.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Aktuálně nejsou aktivní výzvy.
            </p>
          ) : (
            <div className="space-y-4">
              {challengesWithProgress.map((challenge) => {
                const percentage = Math.min(
                  (challenge.current / challenge.target) * 100,
                  100
                );

                return (
                  <div key={challenge.id}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-[var(--text-primary)] text-sm">
                        {challenge.title}
                      </h4>
                      {challenge.isCompleted && (
                        <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          Splněno
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          challenge.isCompleted
                            ? "bg-green-500"
                            : "bg-[var(--accent-primary)]"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Progress Text */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">
                        {challenge.current} / {challenge.target}
                      </span>
                      {!challenge.isCompleted && (
                        <span className="text-[var(--accent-primary)] font-medium">
                          Ještě {challenge.remaining}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <Link
                href="/me"
                className="block text-center text-sm text-[var(--accent-primary)] hover:underline mt-4"
              >
                Zobrazit všechny výzvy →
              </Link>
            </div>
          )}
        </div>

        {/* Card 3: Tvoje pozice */}
        <div className="rounded-2xl border p-6 bg-white md:col-span-2">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            📊 Tvoje pozice
          </h3>

          {!isAuthenticated ? (
            <div className="text-center py-4">
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Přihlas se a sbírej pozice v žebříčku
              </p>
              <Link
                href="/leaderboard"
                className="inline-block px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Zobrazit žebříčky
              </Link>
            </div>
          ) : userRanks ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🚶</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    Chodec
                  </span>
                </div>
                <p className="text-2xl font-bold text-[var(--accent-primary)]">
                  {userRanks.walkerRank}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  za posledních 30 dní
                </p>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">✍️</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    Autor
                  </span>
                </div>
                <p className="text-2xl font-bold text-[var(--accent-primary)]">
                  {userRanks.authorRank}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  za posledních 30 dní
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              Načítání statistik...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
