export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users } from "lucide-react";
import OccurrencesList from "./OccurrencesList";
import OrganizerPanel from "./OrganizerPanel";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ActivityDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();

  // 1) Current user (server-side)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    console.error("auth.getUser error:", userErr);
  }

  // 2) Activity by slug
  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (activityError || !activity) {
    console.error("Fetch activity error:", activityError);
    notFound();
  }

  // 3) Organizer check via RPC (robust)
  let isOrganizer = false;
  if (user) {
    const { data: organizerCheck, error: orgErr } = await supabase.rpc(
      "is_activity_organizer",
      {
        p_activity_id: activity.id,
        p_user_id: user.id,
      }
    );

    if (orgErr) {
      console.error("is_activity_organizer RPC error:", orgErr);
      // Keep isOrganizer false, but now we know WHY.
    } else {
      isOrganizer = organizerCheck === true;
    }
  }

  // 4) Occurrences
  const { data: occurrences, error: occurrencesError } = await supabase
    .from("activity_occurrences")
    .select("*")
    .eq("activity_id", activity.id)
    .order("starts_at", { ascending: false })
    .limit(20);

  if (occurrencesError) {
    console.error("Fetch occurrences error:", occurrencesError);
  }

  const occurrencesList = occurrences ?? [];
  const occurrenceIds = occurrencesList.map((o) => o.id);

  // 5) My check-ins (for badges/buttons)
  const myCheckins: Record<string, any> = {};
  if (user && occurrenceIds.length > 0) {
    const { data: checkins, error: myCheckinsErr } = await supabase
      .from("activity_checkins")
      .select("*")
      .eq("user_id", user.id)
      .in("occurrence_id", occurrenceIds);

    if (myCheckinsErr) {
      console.error("Fetch my checkins error:", myCheckinsErr);
    }

    if (checkins) {
      for (const c of checkins) {
        myCheckins[c.occurrence_id] = c;
      }
    }
  }

  // 6) Pending check-ins (organizer only)
  // IMPORTANT: keep it simple for MVP; nested joins often break if relationships are not defined.
  let pendingCheckins: any[] = [];
  if (isOrganizer && occurrenceIds.length > 0) {
    const { data: pending, error: pendingErr } = await supabase
      .from("activity_checkins")
      .select("id, occurrence_id, user_id, status, created_at")
      .eq("status", "pending")
      .in("occurrence_id", occurrenceIds)
      .order("created_at", { ascending: false });

    if (pendingErr) {
      console.error("Fetch pending checkins error:", pendingErr);
    } else {
      pendingCheckins = pending ?? [];
    }
  }

  // Debug object
  const debug = {
    slug,
    activityId: activity.id,
    userId: user?.id ?? null,
    isOrganizer,
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Debug Output */}
      <pre className="mb-4 rounded-lg border p-3 text-xs overflow-auto">
        {JSON.stringify(debug, null, 2)}
      </pre>

      {/* Activity Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-3xl">{activity.title}</CardTitle>
              {activity.location_name && (
                <CardDescription className="flex items-center gap-2 mt-2 text-base">
                  <MapPin className="w-4 h-4" />
                  {activity.location_name}
                </CardDescription>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {activity.type}
              </Badge>
              {isOrganizer && (
                <Badge variant="outline" className="text-sm">
                  organizer
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        {activity.description && (
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {activity.description}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Organizer Panel */}
      {isOrganizer ? (
        <OrganizerPanel
          activityId={activity.id}
          pendingCheckins={pendingCheckins}
          occurrences={occurrencesList}
        />
      ) : null}

      {/* Occurrences List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Nadcházející běhy
          </CardTitle>
          <CardDescription>
            {occurrencesList.length === 0
              ? "Zatím nejsou naplánované žádné běhy"
              : `Celkem ${occurrencesList.length} běhů`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {occurrencesList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Žádné běhy zatím nejsou naplánované.</p>
              {isOrganizer && (
                <p className="text-sm mt-1">
                  Použij panel organizátora výše pro přidání nového běhu.
                </p>
              )}
              {!isOrganizer && user && (
                <p className="text-sm mt-1">
                  Jsi přihlášený, ale nejsi organizátor této aktivity.
                </p>
              )}
              {!user && (
                <p className="text-sm mt-1">
                  Přihlas se, ať můžeš dělat check-in a sbírat XP.
                </p>
              )}
            </div>
          ) : (
            <OccurrencesList
              occurrences={occurrencesList}
              myCheckins={myCheckins}
              isAuthenticated={!!user}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}