import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export type JournalEntry = {
  id: string;
  user_id: string;
  place_id: string | null;
  content: string;
  visibility: "private" | "public";
  created_at: string;
  updated_at: string;
};

/**
 * Create a new journal entry
 * Requires authentication
 */
export async function createJournalEntry({
  place_id = null,
  content,
  visibility,
}: {
  place_id?: string | null;
  content: string;
  visibility: "private" | "public";
}): Promise<JournalEntry> {
  const supabase = await getSupabaseServerClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Insert journal entry
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      place_id,
      content,
      visibility,
    })
    .select("*")
    .single();

  if (error) {
    console.error("createJournalEntry error:", error);
    throw new Error(`Failed to create journal entry: ${error.message}`);
  }

  return data as JournalEntry;
}

/**
 * Get current user's journal entries
 * Returns empty array if not authenticated
 */
export async function getMyJournalEntries(
  limit = 50
): Promise<JournalEntry[]> {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return [];
    }

    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("getMyJournalEntries error:", error);
      return [];
    }

    return (data as JournalEntry[]) || [];
  } catch (error) {
    console.error("getMyJournalEntries exception:", error);
    return [];
  }
}

/**
 * Get public journal entries for a specific place
 */
export async function getPublicJournalEntriesForPlace(
  placeId: string,
  limit = 20
): Promise<JournalEntry[]> {
  try {
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("place_id", placeId)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("getPublicJournalEntriesForPlace error:", error);
      return [];
    }

    return (data as JournalEntry[]) || [];
  } catch (error) {
    console.error("getPublicJournalEntriesForPlace exception:", error);
    return [];
  }
}

/**
 * Get places by IDs (batch load for journal entries)
 * Returns a Map of placeId -> place name
 */
export async function getPlaceNamesByIds(
  placeIds: string[]
): Promise<Map<string, string>> {
  const placeMap = new Map<string, string>();

  if (placeIds.length === 0) {
    return placeMap;
  }

  try {
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("places")
      .select("id, name")
      .in("id", placeIds);

    if (error) {
      console.error("getPlaceNamesByIds error:", error);
      return placeMap;
    }

    if (data) {
      data.forEach((place) => {
        placeMap.set(place.id, place.name);
      });
    }

    return placeMap;
  } catch (error) {
    console.error("getPlaceNamesByIds exception:", error);
    return placeMap;
  }
}

/**
 * Get a single journal entry by ID (only if owned by current user)
 * Returns null if not found or not owned
 */
export async function getMyJournalEntryById(
  id: string
): Promise<JournalEntry | null> {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("getMyJournalEntryById error:", error);
      return null;
    }

    return data as JournalEntry | null;
  } catch (error) {
    console.error("getMyJournalEntryById exception:", error);
    return null;
  }
}
