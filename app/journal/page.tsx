import Container from "@/components/Container";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import {
  getMyJournalEntries,
  getPlaceNamesByIds,
} from "@/lib/db/journal";
import MyJournalList from "@/components/journal/MyJournalList";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  // Check authentication
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  // Fetch journal entries
  const journalEntries = await getMyJournalEntries(30);

  // Batch load place names for journal entries
  const placeIds = journalEntries
    .filter((entry) => entry.place_id)
    .map((entry) => entry.place_id!);
  const placeNames =
    placeIds.length > 0 ? await getPlaceNamesByIds(placeIds) : new Map();

  // Prepare data for client component (serialize Map to object and ensure dates are strings)
  const entriesForClient = journalEntries.map((e) => ({
    id: e.id,
    place_id: e.place_id ?? null,
    content: e.content,
    visibility: e.visibility,
    created_at:
      typeof e.created_at === "string"
        ? e.created_at
        : new Date(e.created_at).toISOString(),
  }));
  const placeNamesObj = Object.fromEntries(placeNames.entries());

  return (
    <Container>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Můj deník
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Tvoje zážitky a poznámky z výletů
          </p>
        </div>
        <Link
          href="/journal/new"
          className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
        >
          Nový záznam
        </Link>
      </div>

      {/* Journal List */}
      <MyJournalList entries={entriesForClient} placeNames={placeNamesObj} />
    </Container>
  );
}
