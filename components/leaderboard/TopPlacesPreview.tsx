// Mock data for top places
const mockTopPlaces = [
  { id: 1, name: "Karlštejn", area: "Střední Čechy", visits: 89 },
  { id: 2, name: "Kokořínsko", area: "Střední Čechy", visits: 67 },
  { id: 3, name: "Sněžka", area: "Krkonoše", visits: 54 },
];

export default function TopPlacesPreview() {
  return (
    <div className="space-y-3">
      {mockTopPlaces.map((place, index) => (
        <div
          key={place.id}
          className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {/* Rank */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--color-earth)] flex items-center justify-center text-white font-bold">
            {index + 1}
          </div>

          {/* Place info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">
              {place.name}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">{place.area}</p>
          </div>

          {/* Visits */}
          <div className="text-right">
            <p className="text-lg font-bold text-[var(--accent-primary)]">
              {place.visits}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">návštěv</p>
          </div>
        </div>
      ))}
    </div>
  );
}
