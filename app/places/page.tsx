import Link from "next/link";
import { fetchPlacesFiltered } from "@/lib/db/places";
import { parseSearchParams } from "@/lib/placesFilters";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import PlacesFilters from "./PlacesFilters";
import { PLACE_TYPE_LABELS } from "@/lib/constants/placeTypes";
import { getBatchAudioScriptStatus } from "@/lib/audio/audioScriptStatus";
import { Badge } from "@/components/ui/badge";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlacesPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = parseSearchParams(params);

  // Get current user
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id || null;

  const places = await fetchPlacesFiltered(filters, currentUserId);

  // Get available areas for dropdown
  const availableAreas = await getAvailableAreas();

  // Get audio script statuses for all places
  const placeIds = places.map((p) => p.id);
  const audioScriptStatuses = await getBatchAudioScriptStatus(placeIds);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Trasy</h1>
          <p className="mt-2 text-sm opacity-80">
            Prozkoumej trasy od ostatních autorů
          </p>
        </div>

        <Link
          href="/create-place"
          className="rounded-xl border px-4 py-2 text-sm hover:bg-black/5"
        >
          + Vytvořit trasu
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-6">
        <PlacesFilters
          currentFilters={filters}
          availableAreas={availableAreas}
          currentUserId={currentUserId}
        />
      </div>

      {/* Results count */}
      <div className="mt-6">
        <p className="text-sm opacity-80">
          Nalezeno <span className="font-semibold">{places.length}</span> tras
        </p>
      </div>

      {/* Places list */}
      {places.length === 0 ? (
        <div className="mt-4 rounded-2xl border p-6">
          <p className="text-sm opacity-80">
            Žádné trasy nevyhovují zvoleným filtrům. Zkus upravit kritéria nebo{" "}
            <Link href="/places" className="underline">
              resetovat filtry
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {places.map((p) => {
            const scriptStatus = audioScriptStatuses.get(p.id);
            const scriptStatusConfig = {
              complete: {
                emoji: "🟢",
                label: "Audio kompletní",
                color: "bg-green-100 text-green-800 border-green-300",
              },
              partial: {
                emoji: "🟡",
                label: "Audio rozpracované",
                color: "bg-yellow-100 text-yellow-800 border-yellow-300",
              },
              empty: {
                emoji: "🔴",
                label: "Bez audia",
                color: "bg-red-100 text-red-800 border-red-300",
              },
            };
            const statusConfig = scriptStatus
              ? scriptStatusConfig[scriptStatus.status]
              : null;

            return (
              <div key={p.id} className="rounded-2xl border overflow-hidden relative">
                {/* Audio script status badge in corner */}
                {statusConfig && (
                  <div className="absolute top-3 right-3 z-10">
                    <div
                      className={`rounded-full border px-2 py-1 text-xs font-medium ${statusConfig.color} shadow-sm`}
                      title={statusConfig.label}
                    >
                      {statusConfig.emoji}
                    </div>
                  </div>
                )}

                {/* Cover image */}
                {p.cover_public_url && (
                  <div className="w-full aspect-video bg-gray-100">
                    <img
                      src={p.cover_public_url}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <p className="mt-1 text-sm opacity-80">{p.area}</p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border px-2 py-1">
                        {PLACE_TYPE_LABELS[p.type]}
                      </span>
                      <span className="rounded-full border px-2 py-1">
                        ⏱ {p.time_min} min
                      </span>
                      <span className="rounded-full border px-2 py-1">
                        ⚡ {p.difficulty}/5
                      </span>
                      {/* Audio status badge */}
                      {p.audio_status === "ready" && (
                        <span className="rounded-full bg-primary text-primary-foreground px-2 py-1">
                          🎧 Audio připraveno
                        </span>
                      )}
                      {p.audio_status === "draft" && (
                        <span className="rounded-full border border-muted-foreground/30 px-2 py-1">
                          📝 Audio rozpracované
                        </span>
                      )}
                      {p.audio_status === "missing" && (
                        <span className="rounded-full bg-muted text-muted-foreground px-2 py-1">
                          ❌ Bez audia
                        </span>
                      )}
                      {p.sport_type === "run" && (
                        <Badge variant="outline">🏃 RUN</Badge>
                      )}
                      {p.sport_type === "run_inline" && (
                        <Badge variant="outline">🛼 RUN + INLINE</Badge>
                      )}
                    </div>

                    <p className="mt-3 text-sm opacity-80">{p.why}</p>
                  </div>

                  <Link
                    href={`/p/${p.id}`}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5"
                  >
                    Detail
                  </Link>
                </div>
              </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

/**
 * Get list of unique areas from database
 */
async function getAvailableAreas(): Promise<string[]> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("places")
    .select("area")
    .order("area");

  if (error) return [];

  // Get unique areas
  const areas = [...new Set(data.map((p) => p.area))].filter(Boolean);
  return areas;
}
