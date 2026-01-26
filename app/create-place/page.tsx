import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { redirect } from "next/navigation";
import CreatePlaceForm from "./CreatePlaceForm";

export default async function CreatePlacePage() {
  // Check if user is authenticated
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect if not authenticated
  if (!user) {
    redirect("/?login=1");
  }

  return (
    <Container>
      <PageHeader
        title="Přidat nové místo"
        description="Sdílej s ostatními své oblíbené místo"
      />

      <Card className="max-w-2xl mx-auto">
        <CreatePlaceForm />
      </Card>
    </Container>
  );
}
