/**
 * XP and Level Calculation Helpers
 *
 * Centralized logic for XP/level system.
 * Change these formulas to adjust progression difficulty.
 */

/**
 * Calculate level from total XP
 * Formula: level = floor(total_xp / 100) + 1
 *
 * Examples:
 * - 0 XP = Level 1
 * - 99 XP = Level 1
 * - 100 XP = Level 2
 * - 500 XP = Level 6
 */
export function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / 100) + 1;
}

/**
 * Calculate XP required for next level
 */
export function xpForNextLevel(currentLevel: number): number {
  return currentLevel * 100;
}

/**
 * Calculate XP progress towards next level (0-100%)
 */
export function calculateLevelProgress(totalXp: number): {
  currentLevel: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
} {
  const currentLevel = calculateLevel(totalXp);
  const xpAtLevelStart = (currentLevel - 1) * 100;
  const xpInCurrentLevel = totalXp - xpAtLevelStart;
  const xpNeededForNextLevel = 100; // Always 100 XP per level

  const progressPercent = Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100);

  return {
    currentLevel,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent,
  };
}

/**
 * Format XP number for display (e.g., "1,234 XP")
 */
export function formatXP(xp: number): string {
  return xp.toLocaleString();
}
