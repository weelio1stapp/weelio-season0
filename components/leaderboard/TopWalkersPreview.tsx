import type { TopWalker } from "@/lib/db/leaderboard";

interface TopWalkersPreviewProps {
  walkers: TopWalker[];
}

function shortenUserId(userId: string): string {
  if (userId.length <= 12) return userId;
  return `${userId.slice(0, 6)}...${userId.slice(-6)}`;
}

export default function TopWalkersPreview({ walkers }: TopWalkersPreviewProps) {
  if (walkers.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-[var(--text-secondary)]">
        Zatím nejsou žádní chodci
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {walkers.map((walker, index) => (
        <div
          key={walker.user_id}
          className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {/* Rank */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--color-earth)] flex items-center justify-center text-white font-bold">
            {index + 1}
          </div>

          {/* Walker info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate font-mono text-sm">
              User {shortenUserId(walker.user_id)}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {walker.unique_places} míst
            </p>
          </div>

          {/* Visits */}
          <div className="text-right">
            <p className="text-lg font-bold text-[var(--accent-primary)]">
              {walker.visit_count}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">návštěv</p>
          </div>
        </div>
      ))}
    </div>
  );
}
