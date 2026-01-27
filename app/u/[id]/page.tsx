import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import Link from "next/link";
import { getProfileById, formatUserDisplay } from "@/lib/db/profiles";
import { getAuthorStats, getTopAuthoredPlaces } from "@/lib/db/userStats";
import { notFound } from "next/navigation";

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

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function UserProfilePage({ params }: PageProps) {
  const { id: userId } = await params;

  // Fetch profile and stats in parallel
  const [profile, authorStats, topPlaces] = await Promise.all([
    getProfileById(userId),
    getAuthorStats(userId, 30),
    getTopAuthoredPlaces(userId, 10, null),
  ]);

  // If user has no authored places and no profile, show 404
  if (!profile && authorStats.place_count === 0) {
    notFound();
  }

  const displayName = formatUserDisplay(userId, profile);
  const badge = getBadge(authorStats.place_count, authorStats.total_visits);

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

      <PageHeader title="Profil autora" description={displayName} />

      {/* Profile Card */}
      <Card>
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-4xl ring-4 ring-gray-200">
                ✍️
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {displayName}
            </h2>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="px-3 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-sm font-medium">
                {badge}
              </span>
              {authorStats.total_visits >= 50 && (
                <span className="text-2xl" title="Vysoký engagement">
                  ⭐
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  Vytvořená místa
                </p>
                <p className="text-3xl font-bold text-[var(--accent-primary)]">
                  {authorStats.place_count}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  Celkem návštěv (30 dní)
                </p>
                <p className="text-3xl font-bold text-[var(--accent-primary)]">
                  {authorStats.total_visits.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Authored Places */}
      {topPlaces.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
            Vytvořená místa
          </h3>
          <Card>
            <div className="space-y-3">
              {topPlaces.map((place) => (
                <Link
                  key={place.id}
                  href={`/p/${place.id}`}
                  className="block p-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-[var(--accent-primary)]/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[var(--text-primary)] truncate">
                        {place.name}
                      </h4>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        📍 {place.area}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right ml-4">
                      <p className="text-lg font-bold text-[var(--accent-primary)]">
                        {place.visit_count}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {place.visit_count === 1
                          ? "návštěva"
                          : place.visit_count < 5
                          ? "návštěvy"
                          : "návštěv"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {topPlaces.length === 0 && (
        <div className="mt-8">
          <Card>
            <p className="text-center text-[var(--text-secondary)]">
              Tento uživatel zatím nevytvořil žádná místa.
            </p>
          </Card>
        </div>
      )}
    </Container>
  );
}
