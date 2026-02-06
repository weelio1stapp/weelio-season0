import { notFound, redirect } from "next/navigation";
import { fetchPlaceById } from "@/lib/db/places";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import PlaceForm from "@/components/PlaceForm";
import { RoutePointsManager } from "@/components/route-points/RoutePointsManager";
import { updatePlaceAction } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPlacePage({ params }: Props) {
  const { id } = await params;
  const place = await fetchPlaceById(id);

  if (!place) return notFound();

  // Auth + ownership check
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/?login=1");
  if (user.id !== place.author_user_id) redirect(`/p/${id}`);

  // Bind the placeId to the action
  const boundAction = updatePlaceAction.bind(null, id);

  return (
    <Container>
      <PageHeader title="Upravit místo" description={`Úprava: ${place.name}`} />

      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <PlaceForm
            initialData={place}
            action={boundAction}
            submitLabel="Uložit změny"
          />
        </Card>

        {/* Body trasy (vždy, protože u nás je každé "místo" ve skutečnosti trasa) */}
        <RoutePointsManager routeId={id} />
      </div>
    </Container>
  );
}