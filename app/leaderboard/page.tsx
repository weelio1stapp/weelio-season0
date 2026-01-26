import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import LeaderboardCard from "@/components/leaderboard/LeaderboardCard";
import ComingSoonCard from "@/components/leaderboard/ComingSoonCard";
import TopAuthorsPreview from "@/components/leaderboard/TopAuthorsPreview";
import TopPlacesPreview from "@/components/leaderboard/TopPlacesPreview";
import TopWalkersPreview from "@/components/leaderboard/TopWalkersPreview";
import { getTopPlaces, getTopAuthors, getTopWalkers } from "@/lib/db/leaderboard";

export default async function LeaderboardPage() {
  // Fetch top 3 for each category (30 days window)
  const [topPlaces, topAuthors, topWalkers] = await Promise.all([
    getTopPlaces(3, 30),
    getTopAuthors(3, 30),
    getTopWalkers(3, 30),
  ]);
  return (
    <Container>
      <PageHeader
        title="Žebříčky"
        description="Nejlepší průzkumníci, nejoblíbenější místa a mnoho dalšího"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Authors */}
        <LeaderboardCard
          title="Top autoři"
          description="Autoři s nejoblíbenějšími místy"
          href="/leaderboard/authors"
          icon="✍️"
        >
          <TopAuthorsPreview authors={topAuthors} />
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
          <TopWalkersPreview walkers={topWalkers} />
        </LeaderboardCard>

        {/* Challenges/Seasons - Coming Soon */}
        <ComingSoonCard
          title="Výzvy a sezóny"
          description="Speciální události a soutěže"
          icon="🏆"
        />
      </div>

      {/* Info */}
      <div className="mt-8 p-6 bg-gradient-to-r from-[var(--accent-primary)]/10 to-[var(--color-earth)]/10 rounded-lg border border-[var(--accent-primary)]/20">
        <p className="text-[var(--text-secondary)] text-center">
          Navštěvuj místa, sbírej návštěvy a staň se legendou Weelio!
          <br />
          <span className="text-sm">
            Žebříčky zobrazují statistiky za posledních 30 dní.
          </span>
        </p>
      </div>
    </Container>
  );
}
