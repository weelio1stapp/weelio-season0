import type { TopWalker, TopAuthor } from "@/lib/db/leaderboard";

/**
 * Calculate user's rank in walkers leaderboard
 * Returns rank number (1-based) or null if not in top list
 */
export function getWalkerRank(
  userId: string,
  topWalkers: TopWalker[]
): number | null {
  const index = topWalkers.findIndex((w) => w.user_id === userId);
  return index >= 0 ? index + 1 : null;
}

/**
 * Calculate user's rank in authors leaderboard
 * Returns rank number (1-based) or null if not in top list
 */
export function getAuthorRank(
  userId: string,
  topAuthors: TopAuthor[]
): number | null {
  const index = topAuthors.findIndex((a) => a.user_id === userId);
  return index >= 0 ? index + 1 : null;
}

/**
 * Format rank for display
 */
export function formatRank(rank: number | null, maxRank: number): string {
  if (rank === null) {
    return `mimo TOP ${maxRank}`;
  }
  return `#${rank}`;
}
