import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { leaderboard } from "@/lib/mockData";

export default function LeaderboardPage() {
  return (
    <Container>
      <PageHeader
        title="Žebříček"
        description="Top 10 průzkumníků Weelio"
      />

      <Card>
        <div className="space-y-4">
          {leaderboard.map((entry) => (
            <div
              key={entry.rank}
              className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--color-earth)] flex items-center justify-center text-white font-bold text-lg">
                {entry.rank === 1 && "👑"}
                {entry.rank === 2 && "🥈"}
                {entry.rank === 3 && "🥉"}
                {entry.rank > 3 && entry.rank}
              </div>

              {/* Name */}
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-[var(--text-primary)]">
                  {entry.name}
                </h3>
                <Badge variant="accent">{entry.badge}</Badge>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className="text-2xl font-bold text-[var(--accent-primary)]">
                  {entry.points.toLocaleString()}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">bodů</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Info */}
      <div className="mt-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Sbírej body navštěvováním míst, sdílením fotek a psaním recenzí.
        </p>
      </div>
    </Container>
  );
}
