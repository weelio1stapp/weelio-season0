import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

/**
 * Get a single profile by user ID
 * Returns null if profile doesn't exist
 */
export async function getProfileById(
  userId: string
): Promise<Profile | null> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("getProfileById error:", error);
      return null;
    }

    return data as Profile | null;
  } catch (error) {
    console.error("getProfileById exception:", error);
    return null;
  }
}

/**
 * Get multiple profiles by user IDs
 * Returns a Map of userId -> Profile
 * Missing profiles will not be in the map
 */
export async function getProfilesByIds(
  userIds: string[]
): Promise<Map<string, Profile>> {
  const profileMap = new Map<string, Profile>();

  if (userIds.length === 0) {
    return profileMap;
  }

  try {
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    if (error) {
      console.error("getProfilesByIds error:", error);
      return profileMap;
    }

    if (data) {
      data.forEach((profile) => {
        profileMap.set(profile.id, profile as Profile);
      });
    }

    return profileMap;
  } catch (error) {
    console.error("getProfilesByIds exception:", error);
    return profileMap;
  }
}

/**
 * Update or insert profile for current user
 * Returns the updated profile or null on error
 */
export async function upsertProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string }
): Promise<Profile | null> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          ...updates,
        },
        {
          onConflict: "id",
        }
      )
      .select("id, display_name, avatar_url")
      .single();

    if (error) {
      console.error("upsertProfile error:", error);
      return null;
    }

    return data as Profile;
  } catch (error) {
    console.error("upsertProfile exception:", error);
    return null;
  }
}

/**
 * Format user display - use display_name if available, otherwise fallback
 */
export function formatUserDisplay(
  userId: string,
  profile: Profile | null | undefined
): string {
  if (profile?.display_name) {
    return profile.display_name;
  }

  // Fallback: User abc...xyz
  if (userId.length <= 12) {
    return `User ${userId}`;
  }
  return `User ${userId.slice(0, 6)}...${userId.slice(-6)}`;
}
