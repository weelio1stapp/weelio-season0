import { notFound, redirect } from "next/navigation";
import { fetchPlaceByIdWithClient } from "@/lib/db/places";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import PlaceForm from "@/components/PlaceForm";
import { RoutePointsManager } from "@/components/route-points/RoutePointsManager";
import { updatePlaceAction } from "./actions";
import { fetchRoutePoints } from "@/lib/db/route-points";
import {
  fetchAudioSegments,
  fetchIntroSegment,
} from "@/lib/db/audio-segments";
import AudioScriptEditor from "@/components/audio/AudioScriptEditor";

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

  // 3. Kontrola vlastnictví: author_id (podle DB naming ústavy)
  if (!place.author_id || user.id !== place.author_id) {
    redirect(`/p/${id}`);
  }

  // 4. Load route points and audio segments
  const [routePoints, audioSegments, introSegment] = await Promise.all([
    fetchRoutePoints(id),
    fetchAudioSegments(id),
    fetchIntroSegment(id),
  ]);

  // Create map of route_point_id -> audio segment for easy lookup
  const pointSegmentsMap = new Map(
    audioSegments
      .filter((seg) => seg.segment_type === "point" && seg.route_point_id)
      .map((seg) => [seg.route_point_id!, seg])
  );

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

        {/* Audio script editor */}
        <AudioScriptEditor
          placeId={id}
          routePoints={routePoints}
          introSegment={introSegment}
          pointSegments={pointSegmentsMap}
        />
      </div>
    </Container>
  );
}
