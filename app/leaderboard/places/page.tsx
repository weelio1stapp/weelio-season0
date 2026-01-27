import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import Link from "next/link";
import { getTopPlaces } from "@/lib/db/leaderboard";
import { PLACE_TYPE_LABELS } from "@/lib/placesFilters";

export const dynamic = "force-dynamic";

export default async function PlacesLeaderboardPage() {
  const topPlaces = await getTopPlaces(10, 30);
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

      {topPlaces.length === 0 ? (
        <Card>
          <p className="text-center text-[var(--text-secondary)]">
            Zatím nejsou žádné návštěvy míst.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="space-y-4">
            {topPlaces.map((place, index) => {
              const isTrending = place.visit_count >= 10;
              const isTop3 = index < 3;

              return (
                <Link
                  key={place.place_id}
                  href={`/p/${place.place_id}`}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-[var(--accent-primary)]/20"
                >
                  {/* Rank Badge */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--color-earth)] flex items-center justify-center text-white font-bold text-lg">
                    {index === 0 && "👑"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && index + 1}
                  </div>

                  {/* Thumbnail */}
                  {place.thumbnail_url ? (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden ring-2 ring-gray-200">
                      <img
                        src={place.thumbnail_url}
                        alt={place.place_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-2xl">
                      📍
                    </div>
                  )}

                  {/* Place info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-[var(--text-primary)] truncate">
                        {place.place_name}
                      </h3>
                      {isTrending && (
                        <span className="flex-shrink-0 text-sm" title="Trendy místo">
                          🔥
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-secondary)]">
                      <span className="px-2 py-0.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-xs font-medium">
                        {PLACE_TYPE_LABELS[place.type]}
                      </span>
                      <span>{place.area}</span>
                    </div>
                  </div>

                  {/* Visits */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-[var(--accent-primary)]">
                      {place.visit_count}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {place.visit_count === 1 ? "návštěva" : place.visit_count < 5 ? "návštěvy" : "návštěv"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Info */}
      <div className="mt-8 text-center">
        <p className="text-[var(--text-secondary)]">
          Žebříček zobrazuje nejnavštěvovanější místa za posledních 30 dní.
          <br />
          <span className="text-sm">
            Klikni na místo pro zobrazení detailu.
          </span>
        </p>
      </div>
    </Container>
  );
}
