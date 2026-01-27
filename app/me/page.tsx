import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getProfileById, formatUserDisplay } from "@/lib/db/profiles";
import {
  getAuthorStats,
  getWalkerStats,
  getTopAuthoredPlaces,
} from "@/lib/db/userStats";
import {
  getActiveSeason,
  getActiveChallenges,
  getMyChallengeProgress,
} from "@/lib/db/challenges";
import ChallengesCard from "@/components/leaderboard/ChallengesCard";

export const dynamic = "force-dynamic";

/**
 * Get badge based on engagement
 */
function getAuthorBadge(placeCount: number, totalVisits: number): string {
  if (totalVisits >= 100 || placeCount >= 10) return "Legendární autor";
  if (totalVisits >= 50 || placeCount >= 5) return "Zkušený autor";
  if (totalVisits >= 20 || placeCount >= 3) return "Aktivní autor";
  return "Začínající autor";
}

/**
 * Get walker badge based on visit count
 */
function getWalkerBadge(visitCount: number, uniquePlaces: number): string {
  if (visitCount >= 50 || uniquePlaces >= 20) return "Legendární chodec";
  if (visitCount >= 25 || uniquePlaces >= 10) return "Zkušený chodec";
  if (visitCount >= 10 || uniquePlaces >= 5) return "Aktivní chodec";
  return "Začínající chodec";
}

export default async function MyProfilePage() {
  // Check authentication
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/leaderboard");
  }

  const userId = user.id;

  // Fetch profile and stats in parallel
  const [profile, authorStats, walkerStats, topPlaces, season, challenges] =
    await Promise.all([
      getProfileById(userId),
      getAuthorStats(userId, 30),
      getWalkerStats(userId, 30),
      getTopAuthoredPlaces(userId, 10, null),
      getActiveSeason(),
      getActiveChallenges(),
    ]);

  // Fetch challenge progress (separate to handle potential errors)
  let progress: Awaited<ReturnType<typeof getMyChallengeProgress>> = [];
  try {
    progress = await getMyChallengeProgress(userId);
  } catch (error: any) {
    console.error("Failed to fetch challenge progress:", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
  }

  const displayName = formatUserDisplay(userId, profile);
  const authorBadge = getAuthorBadge(
    authorStats.place_count,
    authorStats.total_visits
  );
  const walkerBadge = getWalkerBadge(
    walkerStats.visit_count,
    walkerStats.unique_places
  );

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

      <PageHeader title="Můj profil" description="Tvoje statistiky na Weelio" />

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
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-4xl ring-4 ring-gray-200">
                👤
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {displayName}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {user.email}
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              {authorStats.place_count > 0 && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                  ✍️ {authorBadge}
                </span>
              )}
              {walkerStats.visit_count > 0 && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  🚶 {walkerBadge}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              Vytvořená místa
            </p>
            <p className="text-3xl font-bold text-[var(--accent-primary)]">
              {authorStats.place_count}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              Návštěvy míst (30d)
            </p>
            <p className="text-3xl font-bold text-[var(--accent-primary)]">
              {authorStats.total_visits.toLocaleString()}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              Moje návštěvy (30d)
            </p>
            <p className="text-3xl font-bold text-[var(--accent-primary)]">
              {walkerStats.visit_count}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              Unikátní místa
            </p>
            <p className="text-3xl font-bold text-[var(--accent-primary)]">
              {walkerStats.unique_places}
            </p>
          </div>
        </Card>
      </div>

      {/* Authored Places */}
      {topPlaces.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
            Moje vytvořená místa
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

          <div className="mt-4 text-center">
            <Link
              href="/places?myPlaces=true"
              className="text-sm text-[var(--accent-primary)] hover:underline"
            >
              Zobrazit všechna moje místa →
            </Link>
          </div>
        </div>
      )}

      {/* Empty State for Authors */}
      {topPlaces.length === 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
            Moje vytvořená místa
          </h3>
          <Card>
            <p className="text-center text-[var(--text-secondary)] mb-4">
              Zatím jsi nevytvořil žádná místa.
            </p>
            <div className="text-center">
              <Link
                href="/create-place"
                className="inline-block px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Vytvořit první místo
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* Season & Challenges */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
          Sezóna & výzvy
        </h3>
        {season || challenges.length > 0 ? (
          <ChallengesCard
            season={season}
            challenges={challenges}
            progress={progress}
            isAuthenticated={true}
          />
        ) : (
          <Card>
            <p className="text-center text-[var(--text-secondary)] py-4">
              Aktuálně není aktivní sezóna.
            </p>
          </Card>
        )}
      </div>
    </Container>
  );
}
