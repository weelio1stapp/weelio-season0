import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPlaceById } from "@/lib/db/places";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { hasVisitedToday } from "@/lib/db/visits";
import { getPublicJournalEntriesForPlace } from "@/lib/db/journal";
import { getProfilesByIds } from "@/lib/db/profiles";
import { getPublicRiddlesForPlace } from "@/lib/db/riddles";
import PlaceAuthorActions from "@/components/PlaceAuthorActions";
import PlaceRiddles from "@/components/place/PlaceRiddles";
import PlaceHero from "./PlaceHero";
import PlacePlanSection from "./PlacePlanSection";
import PlaceOnSiteHint from "./PlaceOnSiteHint";
import PlaceOnSiteActions from "./PlaceOnSiteActions";
import PlaceCommunitySection from "./PlaceCommunitySection";
import { Separator } from "@/components/ui/separator";

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

  // Robustně přečti autora (v různých částech projektu může být jiný naming)
  const authorId = (place as any).author_id ?? (place as any).author_user_id;
  const isAuthor = currentUserId === authorId;

  // Check if user has visited today
  const alreadyVisited = currentUserId ? await hasVisitedToday(place.id) : false;

  // Load journal entries and riddles
  const [journalEntries, riddles] = await Promise.all([
    getPublicJournalEntriesForPlace(place.id, 10),
    getPublicRiddlesForPlace(place.id),
  ]);

  // Batch load profiles for journal entries
  const userIds = journalEntries.map((entry) => entry.user_id);
  const profiles =
    userIds.length > 0 ? await getProfilesByIds(userIds) : new Map();

  // Prepare data for PlaceJournalSection
  const profilesRecord: Record<
    string,
    { display_name: string | null; avatar_url: string | null }
  > = {};
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
    created_at:
      typeof e.created_at === "string"
        ? e.created_at
        : new Date(e.created_at).toISOString(),
  }));

  // Load attempts and solved status for current user
  const riddleIds = riddles.map((r) => r.id);
  let attemptsMap = new Map<string, number>();
  let solvedMap = new Map<string, Date>();
  const solvedRiddleIdsArray: string[] = [];

  if (currentUserId && riddleIds.length > 0) {
    const { data: allAttempts } = await supabase
      .from("place_riddle_attempts")
      .select("riddle_id, is_correct, created_at")
      .eq("user_id", currentUserId)
      .in("riddle_id", riddleIds)
      .order("created_at", { ascending: false });

    if (allAttempts) {
      const now = new Date();

      riddles.forEach((riddle) => {
        const cooldownHours = riddle.cooldown_hours ?? 24;
        const windowStart = new Date(
          now.getTime() - cooldownHours * 60 * 60 * 1000
        );

        const riddleAttempts = allAttempts.filter(
          (a) => a.riddle_id === riddle.id
        );

        // Count attempts within window
        const windowedAttempts = riddleAttempts.filter((a) => {
          const attemptDate = new Date(a.created_at);
          return attemptDate >= windowStart;
        });
        attemptsMap.set(riddle.id, windowedAttempts.length);

        // Find last correct attempt within window
        const lastCorrect = riddleAttempts.find((a) => {
          const attemptDate = new Date(a.created_at);
          return a.is_correct && attemptDate >= windowStart;
        });

        if (lastCorrect) {
          solvedMap.set(riddle.id, new Date(lastCorrect.created_at));
          solvedRiddleIdsArray.push(riddle.id);
        }
      });
    }
  }

  // Enrich riddles with attempts_left, solved, can_delete
  const enrichedRiddles = riddles.map((r) => {
    const maxAttempts = r.max_attempts ?? 3;
    const cooldownHours = r.cooldown_hours ?? 24;
    const attemptsUsed = attemptsMap.get(r.id) || 0;
    const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);
    const lastCorrectDate = solvedMap.get(r.id);
    const solved = !!lastCorrectDate;
    const canDelete = currentUserId ? r.created_by === currentUserId : false;

    let nextAvailableAt: string | null = null;
    if (lastCorrectDate) {
      const nextAvailable = new Date(
        lastCorrectDate.getTime() + cooldownHours * 60 * 60 * 1000
      );
      nextAvailableAt = nextAvailable.toISOString();
    }

    return {
      ...r,
      attempts_left: attemptsLeft,
      solved,
      can_delete: canDelete,
      next_available_at: nextAvailableAt,
    };
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Back Link & Author Actions */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/places"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Zpět na místa
        </Link>
        <PlaceAuthorActions
          placeId={place.id}
          placeName={place.name}
          isAuthor={isAuthor}
        />
      </div>

      {/* NEW STRUCTURE - Planning-First Layout */}

      {/* A) PlaceHero - Inspiration, no actions */}
      <div className="mb-6">
        <PlaceHero
          name={place.name}
          area={place.area}
          type={place.type}
          time_min={place.time_min}
          difficulty={place.difficulty}
          why={place.why}
          cover_public_url={place.cover_public_url}
        />
      </div>

      {/* B) PlacePlanSection - PRIMARY CTA: Navigation */}
      <div className="mb-6">
        <PlacePlanSection
          start_lat={place.start_lat}
          start_lng={place.start_lng}
          end_lat={place.end_lat}
          end_lng={place.end_lng}
        />
      </div>

      {/* C) PlaceOnSiteHint - Mental transition */}
      <div className="mb-6">
        <PlaceOnSiteHint />
      </div>

      {/* D) PlaceOnSiteActions - SECONDARY: Visit button */}
      <div className="mb-8">
        <PlaceOnSiteActions
          placeId={place.id}
          placeName={place.name}
          alreadyVisited={alreadyVisited}
          isAuthenticated={!!currentUserId}
        />
      </div>

      <Separator className="my-8" />

      {/* Riddles Section - show if riddles exist OR user is author (to add first riddle) */}
      {(enrichedRiddles.length > 0 || isAuthor) && (
        <div className="mb-8">
          <PlaceRiddles
            placeId={place.id}
            riddles={enrichedRiddles}
            solvedRiddleIds={solvedRiddleIdsArray}
            isAuthenticated={!!currentUserId}
            isPlaceAuthor={isAuthor}
            currentUserId={currentUserId}
          />
        </div>
      )}

      {/* E) PlaceCommunitySection - Tabs: Journal & Photos */}
      <div className="mb-8">
        <PlaceCommunitySection
          placeId={place.id}
          journalEntries={journalEntriesForClient}
          profiles={profilesRecord}
          isAuthenticated={!!currentUserId}
          currentUserId={currentUserId}
          placeAuthorId={authorId}
          currentCoverPath={place.cover_storage_path}
        />
      </div>
    </main>
  );
}
