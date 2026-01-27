import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import Link from "next/link";
import { getTopWalkers } from "@/lib/db/leaderboard";

export const dynamic = "force-dynamic";

/**
 * Shorten user ID for display (e.g., "abc123...xyz789")
 */
function shortenUserId(userId: string): string {
  if (userId.length <= 12) return userId;
  return `${userId.slice(0, 6)}...${userId.slice(-6)}`;
}

/**
 * Get badge based on visit count
 */
function getBadge(visitCount: number, uniquePlaces: number): string {
  if (visitCount >= 50 || uniquePlaces >= 20) return "Legendární chodec";
  if (visitCount >= 25 || uniquePlaces >= 10) return "Zkušený chodec";
  if (visitCount >= 10 || uniquePlaces >= 5) return "Aktivní chodec";
  return "Začínající chodec";
}

export default async function WalkersLeaderboardPage() {
  const topWalkers = await getTopWalkers(10, 30);

  return (
    <Container>
      <div className="mb-6">
        <Link
          href="/leaderboard"
          className="text-sm text-[var(--accent-primary)] hover:underline"
        >
          ← Zpět na žebříčky
        </Link>
      </div>

      <PageHeader
        title="Top chodci"
        description="Uživatelé s nejvíce navštívenými místy"
      />

      {topWalkers.length === 0 ? (
        <Card>
          <p className="text-center text-[var(--text-secondary)]">
            Zatím nejsou žádné návštěvy.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="space-y-4">
            {topWalkers.map((walker, index) => {
              const badge = getBadge(walker.visit_count, walker.unique_places);
              return (
                <div
                  key={walker.user_id}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-[var(--accent-primary)]/20"
                >
                  {/* Rank Badge */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--color-earth)] flex items-center justify-center text-white font-bold text-lg">
                    {index === 0 && "👑"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && index + 1}
                  </div>

                  {/* User Avatar */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-2xl ring-2 ring-gray-200">
                    🚶
                  </div>

                  {/* Walker info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-[var(--text-primary)] font-mono truncate">
                      User {shortenUserId(walker.user_id)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-xs font-medium">
                        {badge}
                      </span>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {walker.unique_places} {walker.unique_places === 1 ? "místo" : walker.unique_places < 5 ? "místa" : "míst"}
                      </span>
                    </div>
                  </div>

                  {/* Visits */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-[var(--accent-primary)]">
                      {walker.visit_count}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {walker.visit_count === 1 ? "návštěva" : walker.visit_count < 5 ? "návštěvy" : "návštěv"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Info */}
      <div className="mt-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Chodci jsou seřazeni podle celkového počtu návštěv za posledních 30 dní.
          <br />
          <span className="text-sm">
            Profily uživatelů budou přidány v budoucí verzi.
          </span>
        </p>
      </div>
    </Container>
  );
}
