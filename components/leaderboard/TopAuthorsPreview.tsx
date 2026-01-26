// Mock data for top authors
const mockTopAuthors = [
  { id: 1, name: "Jan Novák", places: 15, points: 2450 },
  { id: 2, name: "Eva Procházková", places: 12, points: 2100 },
  { id: 3, name: "Petr Svoboda", places: 10, points: 1850 },
];

export default function TopAuthorsPreview() {
  return (
    <div className="space-y-3">
      {mockTopAuthors.map((author, index) => (
        <div
          key={author.id}
          className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {/* Rank */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--color-earth)] flex items-center justify-center text-white font-bold">
            {index === 0 && "👑"}
            {index === 1 && "🥈"}
            {index === 2 && "🥉"}
          </div>

          {/* Name & Stats */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">
              {author.name}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {author.places} míst
            </p>
          </div>

          {/* Points */}
          <div className="text-right">
            <p className="text-lg font-bold text-[var(--accent-primary)]">
              {author.points.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">bodů</p>
          </div>
        </div>
      ))}
    </div>
  );
}
