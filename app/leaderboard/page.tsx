import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import LeaderboardCard from "@/components/leaderboard/LeaderboardCard";
import ComingSoonCard from "@/components/leaderboard/ComingSoonCard";
import TopAuthorsPreview from "@/components/leaderboard/TopAuthorsPreview";
import TopPlacesPreview from "@/components/leaderboard/TopPlacesPreview";

export default function LeaderboardPage() {
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
          description="Průzkumníci s nejvíce přidanými místy"
          href="/leaderboard/authors"
          icon="✍️"
        >
          <TopAuthorsPreview />
        </LeaderboardCard>

        {/* Top Places */}
        <LeaderboardCard
          title="Top místa"
          description="Nejnavštěvovanější místa na Weelio"
          href="/leaderboard/places"
          icon="📍"
        >
          <TopPlacesPreview />
        </LeaderboardCard>

        {/* Top Walkers - Coming Soon */}
        <ComingSoonCard
          title="Top chodci"
          description="Průzkumníci s nejvíce navštívenými místy"
          icon="🚶"
        />

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
          Sbírej body navštěvováním míst, sdílením fotek a psaním recenzí.
          <br />
          <span className="text-sm">
            Žebříčky se aktualizují každý den v půlnoci.
          </span>
        </p>
      </div>
    </Container>
  );
}
