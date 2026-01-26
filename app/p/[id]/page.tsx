import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPlaceById } from "@/lib/db/places";
import { PLACE_TYPE_LABELS } from "@/lib/placesFilters";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { hasVisitedToday } from "@/lib/db/visits";
import PlaceGallery from "@/components/PlaceGallery";
import PlaceAuthorActions from "@/components/PlaceAuthorActions";
import VisitedButton from "@/components/VisitedButton";

/**
 * Format coordinate for Mapy.com route planner
 * @example formatMapyCoord(50.418701, 12.980643) -> "50.418701N, 12.980643E"
 * @example formatMapyCoord(-33.8688, 151.2093) -> "33.8688S, 151.2093E"
 */
function formatMapyCoord(lat: number, lng: number): string {
  const latAbs = Math.abs(lat);
  const lngAbs = Math.abs(lng);
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${latAbs}${latDir}, ${lngAbs}${lngDir}`;
}

/**
 * Build Mapy.com route planner URL
 * Uses rs=coor (coordinate source) and rt (route waypoints)
 */
function getMapyRouteUrl(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): string {
  const startCoord = formatMapyCoord(startLat, startLng);
  const endCoord = formatMapyCoord(endLat, endLng);

  // URL encode the coordinate strings
  const rtStart = encodeURIComponent(startCoord);
  const rtEnd = encodeURIComponent(endCoord);

  // Add x,y,z for better UX (center map on start point)
  return `https://mapy.com/cs/?planovani-trasy=&rs=coor&rs=coor&rt=${rtStart}&rt=${rtEnd}&x=${startLng}&y=${startLat}&z=14`;
}

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
  const isAuthor = currentUserId === place.author_user_id;

  // Check if user has visited today
  const alreadyVisited = await hasVisitedToday(place.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <Link href="/places" className="text-sm opacity-80 hover:opacity-100">
          ← Zpět na místa
        </Link>
        <PlaceAuthorActions
          placeId={place.id}
          placeName={place.name}
          isAuthor={isAuthor}
        />
      </div>

      {/* Hero cover image */}
      {place.cover_public_url && (
        <div className="mb-6 -mx-4 md:mx-0">
          <img
            src={place.cover_public_url}
            alt={place.name}
            className="w-full aspect-video md:aspect-[21/9] object-cover md:rounded-2xl"
          />
        </div>
      )}

      <h1 className="text-3xl font-bold">{place.name}</h1>
      <p className="mt-2 text-sm opacity-80">{place.area}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border px-2 py-1">
          {PLACE_TYPE_LABELS[place.type]}
        </span>
        <span className="rounded-full border px-2 py-1">
          ⏱ {place.time_min} min
        </span>
        <span className="rounded-full border px-2 py-1">
          ⚡ {place.difficulty}/5
        </span>
      </div>

      <div className="mt-6 rounded-2xl border p-6">
        <h3 className="text-base font-semibold">Proč jít</h3>
        <p className="mt-2 text-sm opacity-80">{place.why}</p>
      </div>

      {/* Visited Button */}
      {currentUserId && (
        <div className="mt-6 flex justify-center">
          <VisitedButton placeId={place.id} alreadyVisited={alreadyVisited} />
        </div>
      )}

      {/* Trasa / Mapa - only show if coordinates exist */}
      {place.start_lat &&
        place.start_lng &&
        place.end_lat &&
        place.end_lng && (
          <div className="mt-6 rounded-2xl border p-6">
            <h3 className="text-base font-semibold">Trasa</h3>

            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="font-medium">Start:</span>{" "}
                {place.start_lat.toFixed(5)}, {place.start_lng.toFixed(5)}
              </p>
              <p>
                <span className="font-medium">Cíl:</span>{" "}
                {place.end_lat.toFixed(5)}, {place.end_lng.toFixed(5)}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={getMapyRouteUrl(
                  place.start_lat,
                  place.start_lng,
                  place.end_lat,
                  place.end_lng
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-200 px-4 py-2 text-sm font-medium hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
              >
                🗺 Otevřít v Mapy.com
              </a>
              <a
                href={`https://www.google.com/maps/dir/${place.start_lat},${place.start_lng}/${place.end_lat},${place.end_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-200 px-4 py-2 text-sm font-medium hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
              >
                🌍 Otevřít v Google Maps
              </a>
            </div>
          </div>
        )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-6">
          <h3 className="text-base font-semibold">Audio průvodce</h3>
          <p className="mt-2 text-sm opacity-80">Zatím vypnuto (MVP).</p>
          <p className="mt-1 text-xs opacity-60">
            Backend připraven v place_media.
          </p>
        </div>
        <PlaceGallery
          placeId={place.id}
          currentUserId={currentUserId}
          placeAuthorId={place.author_user_id}
          currentCoverPath={place.cover_storage_path}
        />
      </div>
    </main>
  );
}
