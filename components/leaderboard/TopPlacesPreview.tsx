import type { TopPlace } from "@/lib/db/leaderboard";

interface TopPlacesPreviewProps {
  places: TopPlace[];
}

export default function TopPlacesPreview({ places }: TopPlacesPreviewProps) {
  if (places.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-[var(--text-secondary)]">
        Zatím nejsou žádné návštěvy
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {places.map((place, index) => (
        <div
          key={place.place_id}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {/* Rank Badge */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--color-earth)] flex items-center justify-center text-white font-bold text-sm">
            {index === 0 && "👑"}
            {index === 1 && "🥈"}
            {index === 2 && "🥉"}
          </div>

          {/* Thumbnail */}
          {place.thumbnail_url ? (
            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
              <img
                src={place.thumbnail_url}
                alt={place.place_name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
              📍
            </div>
          )}

          {/* Place info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate text-sm">
              {place.place_name}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] truncate">{place.area}</p>
          </div>

          {/* Visits */}
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-[var(--accent-primary)]">
              {place.visit_count}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">návštěv</p>
          </div>
        </div>
      ))}
    </div>
  );
}
