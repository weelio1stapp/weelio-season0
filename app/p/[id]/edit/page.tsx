import { notFound, redirect } from "next/navigation";
import { fetchPlaceById } from "@/lib/db/places";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import PlaceForm from "@/components/PlaceForm";
import { updatePlaceAction } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPlacePage({ params }: Props) {
  const { id } = await params;
  const place = await fetchPlaceById(id);

  if (!place) return notFound();

  // Check if user is authenticated and is the author
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?login=1");
  }

  if (user.id !== place.author_user_id) {
    // Not the author - redirect to place detail
    redirect(`/p/${id}`);
  }

  // Bind the placeId to the action
  const boundAction = updatePlaceAction.bind(null, id);

  return (
    <Container>
      <PageHeader
        title="Upravit místo"
        description={`Úprava: ${place.name}`}
      />

      <Card className="max-w-2xl mx-auto">
        <PlaceForm
          initialData={place}
          action={boundAction}
          submitLabel="Uložit změny"
        />
      </Card>
    </Container>
  );
}
