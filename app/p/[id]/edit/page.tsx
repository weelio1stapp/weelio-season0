import { notFound, redirect } from "next/navigation";
import { fetchPlaceByIdWithClient } from "@/lib/db/places";
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

  // 1. Auth check NEJDŘÍV (aby server client měl session)
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?login=1");
  }

  // 2. Načti place SE SESSIONEM (RLS povolí čtení) - použij stejný supabase client
  const place = await fetchPlaceByIdWithClient(supabase, id);

  if (!place) return notFound();

  // 3. Robustní kontrola vlastnictví: author_id (primární) nebo author_user_id (fallback)
  const authorId = (place as any).author_id ?? (place as any).author_user_id;

  if (!authorId || user.id !== authorId) {
    redirect(`/p/${id}`);
  }

  const boundAction = updatePlaceAction.bind(null, id);

  return (
    <Container>
      <PageHeader title="Upravit trasu" description={`Úprava: ${place.name}`} />

      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <PlaceForm
            initialData={place}
            action={boundAction}
            submitLabel="Uložit změny"
          />
        </Card>

        {/* Body na trase – vždy (protože v aplikaci je vše trasa: min. START + END) */}
        <RoutePointsManager routeId={id} />
      </div>
    </Container>
  );
}
