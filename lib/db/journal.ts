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
