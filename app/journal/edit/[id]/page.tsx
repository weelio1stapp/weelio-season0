import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getMyJournalEntryById } from "@/lib/db/journal";
import JournalEditForm from "./ui";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditJournalPage(props: { params: Params }) {
  const params = await props.params;
  const { id } = params;

  // Check authentication
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  // Fetch journal entry (only if owned by user)
  const entry = await getMyJournalEntryById(id);

  if (!entry) {
    notFound();
  }

  return (
    <Container>
      <div className="mb-6">
        <Link
          href="/me"
          className="text-sm text-[var(--accent-primary)] hover:underline"
        >
          ← Zpět na profil
        </Link>
      </div>

      <PageHeader
        title="Upravit záznam"
        description="Změň obsah nebo viditelnost svého záznamu"
      />

      <div className="max-w-2xl mx-auto">
        <JournalEditForm
          id={entry.id}
          content={entry.content}
          visibility={entry.visibility as "private" | "public"}
          placeId={entry.place_id}
        />
      </div>
    </Container>
  );
}
