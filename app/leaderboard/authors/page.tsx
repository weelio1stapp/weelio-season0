import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import Link from "next/link";
import { getTopAuthors } from "@/lib/db/leaderboard";

export const dynamic = "force-dynamic";

/**
 * Shorten user ID for display (e.g., "abc123...xyz789")
 */
function shortenUserId(userId: string): string {
  if (userId.length <= 12) return userId;
  return `${userId.slice(0, 6)}...${userId.slice(-6)}`;
}

/**
 * Get badge based on engagement
 */
function getBadge(placeCount: number, totalVisits: number): string {
  if (totalVisits >= 100 || placeCount >= 10) return "Legendární autor";
  if (totalVisits >= 50 || placeCount >= 5) return "Zkušený autor";
  if (totalVisits >= 20 || placeCount >= 3) return "Aktivní autor";
  return "Začínající autor";
}

export default async function AuthorsLeaderboardPage() {
  const topAuthors = await getTopAuthors(10, 30);
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
        title="Top autoři"
        description="Autoři s nejoblíbenějšími místy na Weelio"
      />

      {topAuthors.length === 0 ? (
        <Card>
          <p className="text-center text-[var(--text-secondary)]">
            Zatím nejsou žádní autoři s návštěvami.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="space-y-4">
            {topAuthors.map((author, index) => {
              const badge = getBadge(author.place_count, author.total_visits);
              return (
                <div
                  key={author.user_id}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--color-earth)] flex items-center justify-center text-white font-bold text-lg">
                    {index === 0 && "👑"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && index + 1}
                  </div>

                  {/* Author info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-[var(--text-primary)] font-mono truncate">
                      User {shortenUserId(author.user_id)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-secondary)]">
                      <span className="px-2 py-0.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-xs font-medium">
                        {badge}
                      </span>
                      <span>• {author.place_count} míst</span>
                    </div>
                  </div>

                  {/* Visits */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-[var(--accent-primary)]">
                      {author.total_visits.toLocaleString()}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">návštěv</p>
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
          Autoři jsou seřazeni podle celkového počtu návštěv jejich míst za posledních 30 dní.
          <br />
          <span className="text-sm">
            Profily uživatelů budou přidány v budoucí verzi.
          </span>
        </p>
      </div>
    </Container>
  );
}
