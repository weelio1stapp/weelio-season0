import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import Link from "next/link";

// Mock data for full places leaderboard
const mockPlaces = [
  { id: 1, rank: 1, name: "Karlštejn", area: "Střední Čechy", visits: 89, rating: 4.8 },
  { id: 2, rank: 2, name: "Kokořínsko", area: "Střední Čechy", visits: 67, rating: 4.7 },
  { id: 3, rank: 3, name: "Sněžka", area: "Krkonoše", visits: 54, rating: 4.9 },
  { id: 4, rank: 4, name: "Pračov", area: "Český ráj", visits: 48, rating: 4.6 },
  { id: 5, rank: 5, name: "Macocha", area: "Moravský kras", visits: 45, rating: 4.8 },
  { id: 6, rank: 6, name: "Říp", area: "Střední Čechy", visits: 42, rating: 4.5 },
  { id: 7, rank: 7, name: "Labské pískovce", area: "Děčínsko", visits: 38, rating: 4.7 },
  { id: 8, rank: 8, name: "Třeboň", area: "Jižní Čechy", visits: 35, rating: 4.6 },
  { id: 9, rank: 9, name: "Lužické hory", area: "Severní Čechy", visits: 31, rating: 4.5 },
  { id: 10, rank: 10, name: "Pálava", area: "Jižní Morava", visits: 28, rating: 4.7 },
];

export default function PlacesLeaderboardPage() {
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
        title="Top místa"
        description="Nejnavštěvovanější a nejoblíbenější místa na Weelio"
      />

      <Card>
        <div className="space-y-4">
          {mockPlaces.map((place) => (
            <div
              key={place.id}
              className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--color-earth)] flex items-center justify-center text-white font-bold text-lg">
                {place.rank}
              </div>

              {/* Place info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-[var(--text-primary)] truncate">
                  {place.name}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-secondary)]">
                  <span>📍 {place.area}</span>
                  <span>⭐ {place.rating}</span>
                </div>
              </div>

              {/* Visits */}
              <div className="text-right">
                <p className="text-2xl font-bold text-[var(--accent-primary)]">
                  {place.visits}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">návštěv</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Info */}
      <div className="mt-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Oblíbenost se počítá z počtu návštěv a hodnocení.
          <br />
          <span className="text-sm">
            Žebříček se aktualizuje každý den v půlnoci.
          </span>
        </p>
      </div>
    </Container>
  );
}
