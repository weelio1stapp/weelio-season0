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
import { getUserProgress } from "@/lib/db/progress";
import ChallengesCard from "@/components/leaderboard/ChallengesCard";
import {
  getMyJournalEntries,
  getPlaceNamesByIds,
} from "@/lib/db/journal";

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
  const [
    profile,
    authorStats,
    walkerStats,
    topPlaces,
    season,
    challenges,
    userProgress,
    journalEntries,
  ] = await Promise.all([
    getProfileById(userId),
    getAuthorStats(userId, 30),
    getWalkerStats(userId, 30),
    getTopAuthoredPlaces(userId, 10, null),
    getActiveSeason(),
    getActiveChallenges(),
    getUserProgress(),
    getMyJournalEntries(30),
  ]);

  // Batch load place names for journal entries
  const placeIds = journalEntries
    .filter((entry) => entry.place_id)
    .map((entry) => entry.place_id!);
  const placeNames =
    placeIds.length > 0 ? await getPlaceNamesByIds(placeIds) : new Map();

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

      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Můj profil" description="Tvoje statistiky na Weelio" />
        <Link
          href="/me/edit"
          className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
        >
          Upravit profil
        </Link>
      </div>

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

      {/* XP & Streak Card */}
      {userProgress && (
        <div className="mt-8">
          <Card>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              ⚡ XP & Streak
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* XP */}
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200">
                <div className="text-4xl mb-2">💎</div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  Celkem XP
                </p>
                <p className="text-3xl font-bold text-[var(--accent-primary)]">
                  {userProgress.xp.toLocaleString()}
                </p>
              </div>

              {/* Current Streak */}
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 border border-red-200">
                <div className="text-4xl mb-2">🔥</div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  Aktuální streak
                </p>
                <p className="text-3xl font-bold text-[var(--accent-primary)]">
                  {userProgress.streak_weeks}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {userProgress.streak_weeks === 1
                    ? "týden"
                    : userProgress.streak_weeks < 5
                    ? "týdny"
                    : "týdnů"}
                </p>
              </div>

              {/* Best Streak */}
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                <div className="text-4xl mb-2">🏆</div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  Nejlepší streak
                </p>
                <p className="text-3xl font-bold text-[var(--accent-primary)]">
                  {userProgress.best_streak_weeks}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {userProgress.best_streak_weeks === 1
                    ? "týden"
                    : userProgress.best_streak_weeks < 5
                    ? "týdny"
                    : "týdnů"}
                </p>
              </div>
            </div>

            {userProgress.last_visit_on && (
              <p className="text-xs text-[var(--text-secondary)] text-center mt-4">
                Poslední návštěva:{" "}
                {new Date(userProgress.last_visit_on).toLocaleDateString(
                  "cs-CZ",
                  {
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                  }
                )}
              </p>
            )}
          </Card>
        </div>
      )}

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

      {/* My Journal */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
          Můj deník
        </h3>
        {journalEntries.length > 0 ? (
          <Card>
            <div className="space-y-4">
              {journalEntries.map((entry) => {
                const placeName = entry.place_id
                  ? placeNames.get(entry.place_id)
                  : null;
                const entryDate = new Date(entry.created_at);
                const formattedDate = entryDate.toLocaleDateString("cs-CZ", {
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                });

                // Truncate content to 240 chars
                const truncatedContent =
                  entry.content.length > 240
                    ? entry.content.slice(0, 240) + "…"
                    : entry.content;

                return (
                  <div
                    key={entry.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-[var(--accent-primary)]/30 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          entry.visibility === "public"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {entry.visibility === "public"
                          ? "Veřejný"
                          : "Soukromý"}
                      </span>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                      {truncatedContent}
                    </p>

                    {/* Place link */}
                    {entry.place_id && placeName && (
                      <div className="mt-3">
                        <Link
                          href={`/p/${entry.place_id}`}
                          className="text-sm text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
                        >
                          📍 {placeName}
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="text-center py-8">
              <p className="text-[var(--text-secondary)] mb-4">
                Zatím nemáš žádný záznam v deníku.
              </p>
              <Link
                href="/journal/new"
                className="inline-block px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Napsat první záznam
              </Link>
            </div>
          </Card>
        )}
      </div>
    </Container>
  );
}
