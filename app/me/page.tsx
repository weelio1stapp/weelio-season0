import Container from "@/components/Container";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getProfileById } from "@/lib/db/profiles";
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
import {
  getMyJournalEntries,
  getPlaceNamesByIds,
} from "@/lib/db/journal";
import ProfileHeader from "@/components/profile/ProfileHeader";
import StatsCards from "@/components/profile/StatsCards";
import TabsSection from "@/components/profile/TabsSection";

export const dynamic = "force-dynamic";

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

  // Prepare data for client component (serialize Map to object and ensure dates are strings)
  const entriesForClient = journalEntries.map((e) => ({
    id: e.id,
    place_id: e.place_id ?? null,
    content: e.content,
    visibility: e.visibility,
    created_at:
      typeof e.created_at === "string"
        ? e.created_at
        : new Date(e.created_at).toISOString(),
  }));
  const placeNamesObj = Object.fromEntries(placeNames.entries());

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

  return (
    <Container>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/leaderboard"
          className="text-sm text-primary hover:underline"
        >
          ← Zpět na žebříčky
        </Link>
      </div>

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Můj profil</h1>
        <p className="text-muted-foreground mt-2">
          Tvoje statistiky a aktivita na Weelio
        </p>
      </div>

      {/* Profile Header */}
      <div className="mb-8">
        <ProfileHeader
          profile={profile}
          email={user.email || ""}
          authorStats={authorStats}
          walkerStats={walkerStats}
        />
      </div>

      {/* Stats Cards */}
      {userProgress && (
        <div className="mb-8">
          <StatsCards
            xp={userProgress.xp}
            streak_weeks={userProgress.streak_weeks}
            best_streak_weeks={userProgress.best_streak_weeks}
            walkerStats={walkerStats}
            authorStats={authorStats}
          />
        </div>
      )}

      {/* Last Visit Info */}
      {userProgress?.last_visit_on && (
        <div className="mb-8 text-center">
          <p className="text-xs text-muted-foreground">
            Poslední návštěva:{" "}
            {new Date(userProgress.last_visit_on).toLocaleDateString("cs-CZ", {
              day: "numeric",
              month: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      )}

      {/* Tabs Section */}
      <TabsSection
        season={season}
        challenges={challenges}
        progress={progress}
        journalEntries={entriesForClient}
        placeNames={placeNamesObj}
        authoredPlaces={topPlaces}
      />
    </Container>
  );
}
