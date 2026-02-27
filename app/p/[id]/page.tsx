import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPlaceById } from "@/lib/db/places";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { hasVisitedToday } from "@/lib/db/visits";
import { getPublicJournalEntriesForPlace } from "@/lib/db/journal";
import { getProfilesByIds } from "@/lib/db/profiles";
import { getPublicRiddlesForPlace } from "@/lib/db/riddles";
import { fetchRoutePoints } from "@/lib/db/route-points";
import type { RoutePoint } from "@/lib/db/route-points";
import {
  fetchAudioSegments,
  fetchIntroSegment,
} from "@/lib/db/audio-segments";
import { getAudioScriptStatus } from "@/lib/audio/audioScriptStatus";
import { fetchMyRunsForPlace } from "@/lib/db/runs";
import {
  fetchMyPlannedRunsForPlace,
  materializeMyDueDoneFuturePlans,
} from "@/lib/db/runPlans";
import PlaceAuthorActions from "@/components/PlaceAuthorActions";
import PlaceRiddles from "@/components/place/PlaceRiddles";
import PlaceHero from "./PlaceHero";
import PlacePlanSection from "./PlacePlanSection";
import PlaceOnSiteHint from "./PlaceOnSiteHint";
import PlaceOnSiteActions from "./PlaceOnSiteActions";
import PlaceCommunitySection from "./PlaceCommunitySection";
import RouteSection from "@/components/routes/RouteSection";
import AudioScriptViewer from "@/components/audio/AudioScriptViewer";
import AudioScriptStatusCard from "@/components/audio/AudioScriptStatusCard";
import RecordRunDialog from "./RecordRunDialog";
import PlanRunDialog from "./PlanRunDialog";
import PlannedRunCard from "./PlannedRunCard";
import CompletedRunCard from "./CompletedRunCard";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  // Autor místa (hlavní entity) - podle DB naming ústavy
  const authorId = place.author_id;
  const isAuthor = currentUserId === authorId;

  // Check if user has visited today
  const alreadyVisited = currentUserId ? await hasVisitedToday(place.id) : false;

  // Materialize any due done-future run plans into actual runs (if user is logged in)
  if (currentUserId) {
    await materializeMyDueDoneFuturePlans();
  }

  // Load journal entries, riddles, route points, audio segments, script status, user runs, and planned runs
  const [
    journalEntries,
    riddles,
    routePoints,
    audioSegments,
    introSegment,
    audioScriptStatus,
    myRuns,
    myPlannedRuns,
  ] = await Promise.all([
    getPublicJournalEntriesForPlace(place.id, 10),
    getPublicRiddlesForPlace(place.id),
    fetchRoutePoints(place.id),
    fetchAudioSegments(place.id),
    fetchIntroSegment(place.id),
    getAudioScriptStatus(place.id),
    fetchMyRunsForPlace(place.id, 10),
    fetchMyPlannedRunsForPlace(place.id, 10),
  ]);

  // Create map of route_point_id -> audio segment
  const pointSegmentsMap = new Map(
    audioSegments
      .filter((seg) => seg.segment_type === "point" && seg.route_point_id)
      .map((seg) => [seg.route_point_id!, seg])
  );

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
          sport_type={place.sport_type}
          surface_type={place.surface_type}
        />
      </div>

      {/* Moje běhy na této trase */}
      {currentUserId && (
        <div className="mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Moje běhy na této trase</CardTitle>
              <RecordRunDialog
                placeId={place.id}
                isAuthenticated={!!currentUserId}
              />
            </CardHeader>
            <CardContent>
              {myRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Zatím žádný běh.
                </p>
              ) : (
                <div className="space-y-2">
                  {myRuns.map((run) => (
                    <CompletedRunCard key={run.id} run={run} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plánované běhy na této trase */}
      {currentUserId && (
        <div className="mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Plánované běhy na této trase</CardTitle>
              <PlanRunDialog placeId={place.id} />
            </CardHeader>
            <CardContent>
              {myPlannedRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Zatím žádný plánovaný běh.
                </p>
              ) : (
                <div className="space-y-2">
                  {myPlannedRuns.map((plan) => (
                    <PlannedRunCard key={plan.id} plan={plan} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* B) PlacePlanSection - PRIMARY CTA: Navigation */}
      <div className="mb-6">
        <PlacePlanSection
          start_lat={place.start_lat}
          start_lng={place.start_lng}
          end_lat={place.end_lat}
          end_lng={place.end_lng}
        />
      </div>

      {/* Destinace & Autorská Trasa */}
      <div className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Destinace */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  DESTINACE
                </p>
                <h2 className="text-2xl font-bold">{place.name}</h2>
              </div>

              {/* Autorská Trasa - show if route_name exists */}
              {place.route_name && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      AUTORSKÁ TRASA
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      Autorská trasa
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold">{place.route_name}</h3>
                </div>
              )}

              {/* Route Title */}
              {place.route_title && place.route_title !== place.name && (
                <div className={place.route_name ? "" : "pt-4 border-t"}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {place.route_name ? "TITULEK" : "TRASA"}
                  </p>
                  <h4 className="text-lg font-semibold">
                    {place.route_title}
                  </h4>
                </div>
              )}

              {/* Route Description */}
              {place.route_description && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {place.route_description}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Map & Timeline - with synchronized interaction */}
      <RouteSection points={routePoints} />

      {/* Audio trasy */}
      <div className="mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Audio trasy</CardTitle>
            {isAuthor && (
              <Link
                href={`/p/${place.id}/edit#audio`}
                className="text-sm text-primary hover:underline"
              >
                Nahrát / změnit audio
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {place.audio_status === "missing" &&
            !place.audio_public_url &&
            !place.audio_duration_sec &&
            !place.audio_note ? (
              <p className="text-muted-foreground text-center py-4">
                Audio k této trase zatím není připravené.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge
                    variant={
                      place.audio_status === "ready"
                        ? "default"
                        : place.audio_status === "draft"
                        ? "outline"
                        : "secondary"
                    }
                  >
                    {place.audio_status === "ready"
                      ? "Připraveno"
                      : place.audio_status === "draft"
                      ? "Rozpracované"
                      : "Chybí"}
                  </Badge>
                </div>

                {/* Audio URL */}
                {place.audio_public_url && (
                  <div>
                    <span className="text-sm font-medium">Odkaz: </span>
                    <a
                      href={place.audio_public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {place.audio_public_url}
                    </a>
                  </div>
                )}

                {/* Duration */}
                {place.audio_duration_sec && place.audio_duration_sec > 0 && (
                  <div>
                    <span className="text-sm font-medium">Délka: </span>
                    <span className="text-sm">
                      {Math.floor(place.audio_duration_sec / 60)}:
                      {String(place.audio_duration_sec % 60).padStart(2, "0")}
                    </span>
                  </div>
                )}

                {/* Note */}
                {place.audio_note && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {place.audio_note}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audio Script Viewer - read-only view of audio narration script */}
      <div className="mb-6">
        <AudioScriptViewer
          introSegment={introSegment}
          pointSegments={pointSegmentsMap}
          routePoints={routePoints}
        />
      </div>

      {/* Audio Script Status - quality checklist */}
      {(audioScriptStatus.status !== "empty" || isAuthor) && (
        <div className="mb-6">
          <AudioScriptStatusCard
            placeId={place.id}
            statusData={audioScriptStatus}
            isAuthor={isAuthor}
          />
        </div>
      )}

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
