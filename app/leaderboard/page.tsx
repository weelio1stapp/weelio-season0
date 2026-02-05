import Container from "@/components/Container";
import LeaderboardHeader from "@/components/leaderboard/LeaderboardHeader";
import LeaderboardCard from "@/components/leaderboard/LeaderboardCard";
import ChallengesCard from "@/components/leaderboard/ChallengesCard";
import TopAuthorsPreview from "@/components/leaderboard/TopAuthorsPreview";
import TopPlacesPreview from "@/components/leaderboard/TopPlacesPreview";
import TopWalkersPreview from "@/components/leaderboard/TopWalkersPreview";
import { Card, CardContent } from "@/components/ui/card";
import { getTopPlaces, getTopAuthors, getTopWalkers } from "@/lib/db/leaderboard";
import { getProfilesByIds } from "@/lib/db/profiles";
import {
  getActiveSeason,
  getActiveChallenges,
  getMyChallengeProgress,
} from "@/lib/db/challenges";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  // Get current user
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch top 3 for each category (30 days window)
  const [topPlaces, topAuthors, topWalkers, season, challenges] =
    await Promise.all([
      getTopPlaces(3, 30),
      getTopAuthors(3, 30),
      getTopWalkers(3, 30),
      getActiveSeason(),
      getActiveChallenges(),
    ]);

  // Fetch profiles for all users in leaderboards
  const userIds = [
    ...topAuthors.map((a) => a.user_id),
    ...topWalkers.map((w) => w.user_id),
  ];
  const profiles = await getProfilesByIds(userIds);

  // Fetch challenge progress if user is authenticated
  const progress = user ? await getMyChallengeProgress(user.id) : [];

  return (
    <Container>
      <LeaderboardHeader seasonName={season?.name} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Authors */}
        <LeaderboardCard
          title="Top autoři"
          description="Autoři s nejoblíbenějšími místy"
          href="/leaderboard/authors"
          icon="✍️"
        >
          <TopAuthorsPreview authors={topAuthors} profiles={profiles} />
        </LeaderboardCard>

        {/* Top Places */}
        <LeaderboardCard
          title="Top místa"
          description="Nejnavštěvovanější místa na Weelio"
          href="/leaderboard/places"
          icon="📍"
        >
          <TopPlacesPreview places={topPlaces} />
        </LeaderboardCard>

        {/* Top Walkers */}
        <LeaderboardCard
          title="Top chodci"
          description="Průzkumníci s nejvíce návštěvami"
          href="/leaderboard/walkers"
          icon="🚶"
        >
          <TopWalkersPreview walkers={topWalkers} profiles={profiles} />
        </LeaderboardCard>

        {/* Challenges/Seasons - with orange glass wrapper */}
        <div className="glass-orange rounded-lg">
          <ChallengesCard
            season={season}
            challenges={challenges}
            progress={progress}
            isAuthenticated={!!user}
          />
        </div>
      </div>

      {/* Info */}
      <Card className="mt-8">
        <CardContent className="py-6">
          <p className="text-muted-foreground text-center">
            Navštěvuj místa, sbírej návštěvy a staň se legendou Weelio!
            <br />
            <span className="text-sm">
              Žebříčky zobrazují statistiky za posledních 30 dní.
            </span>
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
