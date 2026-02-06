/**
 * Admin allowlist configuration
 *
 * Add user IDs here to grant admin access.
 * No database changes needed - simple allowlist approach.
 */

export const ADMIN_USER_IDS = [
  "22619a40-39b7-47e7-bc9a-e941211f9586", // Matej Svoboda
  "4defed46-3056-44e8-81b3-62e5d2be1302", // Admin 2
] as const;

/**
 * Check if a user ID is in the admin allowlist
 */
export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId as any);
}
