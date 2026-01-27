import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import Link from "next/link";
import { getTopAuthors } from "@/lib/db/leaderboard";
import { getProfilesByIds, formatUserDisplay } from "@/lib/db/profiles";

export const dynamic = "force-dynamic";

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

  // Fetch profiles for all authors
  const userIds = topAuthors.map((a) => a.user_id);
  const profiles = await getProfilesByIds(userIds);

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
              const isHighEngagement = author.total_visits >= 50;
              const profile = profiles.get(author.user_id);
              const displayName = formatUserDisplay(author.user_id, profile);

              return (
                <Link
                  key={author.user_id}
                  href={`/u/${author.user_id}`}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-[var(--accent-primary)]/20"
                >
                  {/* Rank Badge */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--color-earth)] flex items-center justify-center text-white font-bold text-lg">
                    {index === 0 && "👑"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && index + 1}
                  </div>

                  {/* Author Avatar */}
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="flex-shrink-0 w-14 h-14 rounded-full object-cover ring-2 ring-gray-200"
                    />
                  ) : (
                    <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-2xl ring-2 ring-gray-200">
                      ✍️
                    </div>
                  )}

                  {/* Author info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-[var(--text-primary)] truncate">
                        {displayName}
                      </h3>
                      {isHighEngagement && (
                        <span className="flex-shrink-0 text-sm" title="Vysoký engagement">
                          ⭐
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-xs font-medium">
                        {badge}
                      </span>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {author.place_count} {author.place_count === 1 ? "místo" : author.place_count < 5 ? "místa" : "míst"}
                      </span>
                    </div>
                  </div>

                  {/* Visits */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-[var(--accent-primary)]">
                      {author.total_visits.toLocaleString()}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {author.total_visits === 1 ? "návštěva" : author.total_visits < 5 ? "návštěvy" : "návštěv"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Info */}
      <div className="mt-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Autoři jsou seřazeni podle celkového počtu návštěv jejich míst za posledních 30 dní.
        </p>
      </div>
    </Container>
  );
}
