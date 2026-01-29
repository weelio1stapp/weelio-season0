import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPlaceById, getNearbyPlaces } from "@/lib/db/places";
import { PLACE_TYPE_LABELS } from "@/lib/placesFilters";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { hasVisitedToday, getPlaceStats } from "@/lib/db/visits";
import { getActiveChallenges, getMyChallengeProgress } from "@/lib/db/challenges";
import { getTopWalkers, getTopAuthors } from "@/lib/db/leaderboard";
import { getWalkerRank, getAuthorRank, formatRank } from "@/lib/utils/rank";
import PlaceGallery from "@/components/PlaceGallery";
import PlaceAuthorActions from "@/components/PlaceAuthorActions";
import VisitedButton from "@/components/VisitedButton";
import PlaceNextSteps from "@/components/place/PlaceNextSteps";
import PlaceActionBar from "@/components/place/PlaceActionBar";
import NextStepsSection from "@/components/place/NextStepsSection";
import PlaceJournalSection from "@/components/place/PlaceJournalSection";
import PlaceRiddles from "@/components/place/PlaceRiddles";
import PlaceDailyProgressStrip from "@/components/place/PlaceDailyProgressStrip";
import { getPublicJournalEntriesForPlace } from "@/lib/db/journal";
import { getProfilesByIds, formatUserDisplay } from "@/lib/db/profiles";
import {
  getPublicRiddlesForPlace,
  getMySolvedRiddles,
} from "@/lib/db/riddles";

/**
 * Format coordinate for Mapy.com route planner
 * @example formatMapyCoord(50.418701, 12.980643) -> "50.418701N, 12.980643E"
 * @example formatMapyCoord(-33.8688, 151.2093) -> "33.8688S, 151.2093E"
 */
function formatMapyCoord(lat: number, lng: number): string {
  const latAbs = Math.abs(lat);
  const lngAbs = Math.abs(lng);
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${latAbs}${latDir}, ${lngAbs}${lngDir}`;
}

/**
 * Build Mapy.com route planner URL
 * Uses rs=coor (coordinate source) and rt (route waypoints)
 */
function getMapyRouteUrl(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): string {
  const startCoord = formatMapyCoord(startLat, startLng);
  const endCoord = formatMapyCoord(endLat, endLng);

  // URL encode the coordinate strings
  const rtStart = encodeURIComponent(startCoord);
  const rtEnd = encodeURIComponent(endCoord);

  // Add x,y,z for better UX (center map on start point)
  return `https://mapy.com/cs/?planovani-trasy=&rs=coor&rs=coor&rt=${rtStart}&rt=${rtEnd}&x=${startLng}&y=${startLat}&z=14`;
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const place = await fetchPlaceById(id);

  if (!place) return notFound();

  // Get current user
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id || null;
  const isAuthor = currentUserId === place.author_user_id;

  // Check if user has visited today
  const alreadyVisited = await hasVisitedToday(place.id);

  // Load place statistics
  const stats = await getPlaceStats(place.id);

  // Load next steps data and journal entries
  const [nearbyPlaces, activeChallenges, topWalkers, topAuthors, journalEntries, riddles] =
    await Promise.all([
      getNearbyPlaces(place.area, place.id, 3),
      getActiveChallenges(),
      currentUserId ? getTopWalkers(100, 30) : Promise.resolve([]),
      currentUserId ? getTopAuthors(100, 30) : Promise.resolve([]),
      getPublicJournalEntriesForPlace(place.id, 10),
      getPublicRiddlesForPlace(place.id),
    ]);

  // Batch load profiles for journal entries
  const userIds = journalEntries.map((entry) => entry.user_id);
  const profiles = userIds.length > 0 ? await getProfilesByIds(userIds) : new Map();

  // Prepare data for PlaceJournalSection (convert Map to Record)
  const profilesRecord: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  profiles.forEach((profile, userId) => {
    profilesRecord[userId] = {
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    };
  });

  const journalEntriesForClient = journalEntries.map((e) => ({
    id: e.id,
    user_id: e.user_id,
    content: e.content,
    created_at: typeof e.created_at === "string" ? e.created_at : new Date(e.created_at).toISOString(),
  }));

  // Load solved riddles for current user
  const riddleIds = riddles.map((r) => r.id);
  const solvedRiddleIds = currentUserId && riddleIds.length > 0
    ? await getMySolvedRiddles(riddleIds)
    : new Set<string>();
  const solvedRiddleIdsArray = Array.from(solvedRiddleIds);

  // Load challenge progress if authenticated
  let challengeProgress: Awaited<ReturnType<typeof getMyChallengeProgress>> = [];
  if (currentUserId) {
    try {
      challengeProgress = await getMyChallengeProgress(currentUserId);
    } catch (error: any) {
      console.error("Failed to fetch challenge progress:", {
        code: error?.code,
        message: error?.message,
      });
    }
  }

  // Calculate user ranks if authenticated
  let userRanks = null;
  if (currentUserId) {
    const walkerRank = getWalkerRank(currentUserId, topWalkers);
    const authorRank = getAuthorRank(currentUserId, topAuthors);
    userRanks = {
      walkerRank: formatRank(walkerRank, 100),
      authorRank: formatRank(authorRank, 100),
    };
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <Link href="/places" className="text-sm opacity-80 hover:opacity-100">
          ← Zpět na místa
        </Link>
        <PlaceAuthorActions
          placeId={place.id}
          placeName={place.name}
          isAuthor={isAuthor}
        />
      </div>

      {/* Hero cover image */}
      {place.cover_public_url && (
        <div className="mb-6 -mx-4 md:mx-0">
          <img
            src={place.cover_public_url}
            alt={place.name}
            className="w-full aspect-video md:aspect-[21/9] object-cover md:rounded-2xl"
          />
        </div>
      )}

      <h1 className="text-3xl font-bold">{place.name}</h1>
      <p className="mt-2 text-sm opacity-80">{place.area}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border px-2 py-1">
          {PLACE_TYPE_LABELS[place.type]}
        </span>
        <span className="rounded-full border px-2 py-1">
          ⏱ {place.time_min} min
        </span>
        <span className="rounded-full border px-2 py-1">
          ⚡ {place.difficulty}/5
        </span>
      </div>

      <div className="mt-6 rounded-2xl border p-6">
        <h3 className="text-base font-semibold">Proč jít</h3>
        <p className="mt-2 text-sm opacity-80">{place.why}</p>
      </div>

      {/* Daily Progress Strip */}
      {currentUserId && (
        <PlaceDailyProgressStrip
          placeId={place.id}
          isAuthenticated={true}
          alreadyVisited={alreadyVisited}
        />
      )}

      {/* Quick Actions CTA */}
      <PlaceNextSteps
        placeId={place.id}
        isAuthenticated={!!currentUserId}
        alreadyVisited={alreadyVisited}
      />

      {/* Next Steps Section */}
      <NextStepsSection
        nearbyPlaces={nearbyPlaces}
        challenges={activeChallenges}
        challengeProgress={challengeProgress}
        userRanks={userRanks}
        isAuthenticated={!!currentUserId}
      />

      {/* Place Journal */}
      <PlaceJournalSection
        placeId={place.id}
        journalEntries={journalEntriesForClient}
        profiles={profilesRecord}
        isAuthenticated={!!currentUserId}
      />

      {/* Riddles */}
      <PlaceRiddles
        placeId={place.id}
        riddles={riddles}
        solvedRiddleIds={solvedRiddleIdsArray}
        isAuthenticated={!!currentUserId}
        isPlaceAuthor={isAuthor}
      />

      {/* Statistics */}
      <div className="mt-6 rounded-2xl border p-6">
        <h3 className="text-base font-semibold mb-4">Statistiky</h3>

        {stats.total_visits > 0 ? (
          <div className="space-y-4">
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-xs opacity-60 mb-1">Celkem návštěv</div>
                <div className="text-2xl font-bold">{stats.total_visits}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs opacity-60 mb-1">Posledních 30 dní</div>
                <div className="text-2xl font-bold">{stats.visits_30d}</div>
              </div>
            </div>

            {/* Top Walkers */}
            {stats.top_walkers_30d.length > 0 && (
              <div>
                <div className="text-xs opacity-60 mb-2">
                  Top chodci (30 dní)
                </div>
                <div className="space-y-2">
                  {stats.top_walkers_30d.map((walker, index) => (
                    <div
                      key={walker.user_id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="font-semibold opacity-60">
                        #{index + 1}
                      </span>
                      <span className="opacity-80">
                        User {walker.user_id.slice(0, 8)}...
                        {walker.user_id.slice(-4)}
                      </span>
                      <span className="ml-auto opacity-60">
                        {walker.visit_count} {walker.visit_count === 1 ? "návštěva" : walker.visit_count < 5 ? "návštěvy" : "návštěv"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm opacity-60">
            Zatím zde nikdo nebyl. Buď první!
          </p>
        )}
      </div>

      {/* Trasa / Mapa - only show if coordinates exist */}
      {place.start_lat &&
        place.start_lng &&
        place.end_lat &&
        place.end_lng && (
          <div className="mt-6 rounded-2xl border p-6">
            <h3 className="text-base font-semibold">Trasa</h3>

            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="font-medium">Start:</span>{" "}
                {place.start_lat.toFixed(5)}, {place.start_lng.toFixed(5)}
              </p>
              <p>
                <span className="font-medium">Cíl:</span>{" "}
                {place.end_lat.toFixed(5)}, {place.end_lng.toFixed(5)}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={getMapyRouteUrl(
                  place.start_lat,
                  place.start_lng,
                  place.end_lat,
                  place.end_lng
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-200 px-4 py-2 text-sm font-medium hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
              >
                🗺 Otevřít v Mapy.com
              </a>
              <a
                href={`https://www.google.com/maps/dir/${place.start_lat},${place.start_lng}/${place.end_lat},${place.end_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-200 px-4 py-2 text-sm font-medium hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
              >
                🌍 Otevřít v Google Maps
              </a>
            </div>
          </div>
        )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-6">
          <h3 className="text-base font-semibold">Audio průvodce</h3>
          <p className="mt-2 text-sm opacity-80">Zatím vypnuto (MVP).</p>
          <p className="mt-1 text-xs opacity-60">
            Backend připraven v place_media.
          </p>
        </div>
        <PlaceGallery
          placeId={place.id}
          currentUserId={currentUserId}
          placeAuthorId={place.author_user_id}
          currentCoverPath={place.cover_storage_path}
        />
      </div>

      {/* Mobile Action Bar */}
      <PlaceActionBar
        placeId={place.id}
        isAuthenticated={!!currentUserId}
        alreadyVisited={alreadyVisited}
      />
    </main>
  );
}
