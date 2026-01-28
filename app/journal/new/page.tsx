import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import JournalNewForm from "./ui";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function NewJournalPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;

  // Check authentication
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  // Get placeId from search params (optional)
  const placeId =
    typeof searchParams.placeId === "string" ? searchParams.placeId : undefined;

  return (
    <Container>
      <PageHeader
        title="Nový záznam do deníku"
        description="Zaznamenej svůj zážitek nebo myšlenku"
      />

      <div className="max-w-2xl mx-auto">
        <JournalNewForm placeId={placeId} />
      </div>
    </Container>
  );
}
