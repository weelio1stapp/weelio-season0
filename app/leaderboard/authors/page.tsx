import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Link from "next/link";

// Mock data for full authors leaderboard
const mockAuthors = [
  {
    id: 1,
    rank: 1,
    name: "Jan Novák",
    places: 15,
    points: 2450,
    badge: "Legendární průzkumník",
  },
  {
    id: 2,
    rank: 2,
    name: "Eva Procházková",
    places: 12,
    points: 2100,
    badge: "Zkušený průzkumník",
  },
  {
    id: 3,
    rank: 3,
    name: "Petr Svoboda",
    places: 10,
    points: 1850,
    badge: "Zkušený průzkumník",
  },
  {
    id: 4,
    rank: 4,
    name: "Anna Dvořáková",
    places: 8,
    points: 1620,
    badge: "Aktivní průzkumník",
  },
  {
    id: 5,
    rank: 5,
    name: "Martin Černý",
    places: 7,
    points: 1450,
    badge: "Aktivní průzkumník",
  },
  {
    id: 6,
    rank: 6,
    name: "Lucie Veselá",
    places: 6,
    points: 1280,
    badge: "Aktivní průzkumník",
  },
  {
    id: 7,
    rank: 7,
    name: "Tomáš Novotný",
    places: 5,
    points: 1050,
    badge: "Začínající průzkumník",
  },
  {
    id: 8,
    rank: 8,
    name: "Kateřina Málková",
    places: 4,
    points: 890,
    badge: "Začínající průzkumník",
  },
  {
    id: 9,
    rank: 9,
    name: "David Horák",
    places: 3,
    points: 720,
    badge: "Začínající průzkumník",
  },
  {
    id: 10,
    rank: 10,
    name: "Barbora Kučerová",
    places: 3,
    points: 650,
    badge: "Začínající průzkumník",
  },
];

export default function AuthorsLeaderboardPage() {
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

      <PageHeader
        title="Top autoři"
        description="Průzkumníci s nejvíce přidanými místy na Weelio"
      />

      <Card>
        <div className="space-y-4">
          {mockAuthors.map((author) => (
            <div
              key={author.id}
              className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--color-earth)] flex items-center justify-center text-white font-bold text-lg">
                {author.rank === 1 && "👑"}
                {author.rank === 2 && "🥈"}
                {author.rank === 3 && "🥉"}
                {author.rank > 3 && author.rank}
              </div>

              {/* Name & Badge */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-[var(--text-primary)] truncate">
                  {author.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="accent">{author.badge}</Badge>
                  <span className="text-sm text-[var(--text-secondary)]">
                    • {author.places} míst
                  </span>
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className="text-2xl font-bold text-[var(--accent-primary)]">
                  {author.points.toLocaleString()}
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
          Body za přidání místa: <span className="font-semibold">100 bodů</span>
          <br />
          <span className="text-sm">
            Žebříček se aktualizuje každý den v půlnoci.
          </span>
        </p>
      </div>
    </Container>
  );
}
