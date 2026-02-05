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

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch activity
  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (activityError || !activity) {
    notFound();
  }

  // Check if user is organizer
  let isOrganizer = false;
  if (user) {
    const { data: organizerCheck } = await supabase.rpc("is_activity_organizer", {
      p_activity_id: activity.id,
      p_user_id: user.id,
    });
    isOrganizer = organizerCheck === true;
  }

  // Fetch occurrences (latest first)
  const { data: occurrences, error: occurrencesError } = await supabase
    .from("activity_occurrences")
    .select("*")
    .eq("activity_id", activity.id)
    .order("starts_at", { ascending: false })
    .limit(20);

  if (occurrencesError) {
    console.error("Fetch occurrences error:", occurrencesError);
  }

  const occurrencesList = occurrences || [];
  const occurrenceIds = occurrencesList.map((o) => o.id);

  // Fetch user's check-ins for these occurrences
  let myCheckins: Record<string, any> = {};
  if (user && occurrenceIds.length > 0) {
    const { data: checkins } = await supabase
      .from("activity_checkins")
      .select("*")
      .eq("user_id", user.id)
      .in("occurrence_id", occurrenceIds);

    if (checkins) {
      checkins.forEach((c) => {
        myCheckins[c.occurrence_id] = c;
      });
    }
  }

  // Fetch pending check-ins for organizer
  let pendingCheckins: any[] = [];
  if (isOrganizer && occurrenceIds.length > 0) {
    const { data: pending } = await supabase
      .from("activity_checkins")
      .select(`
        id,
        occurrence_id,
        user_id,
        status,
        created_at,
        users:user_id (
          id,
          display_name,
          username
        )
      `)
      .eq("status", "pending")
      .in("occurrence_id", occurrenceIds)
      .order("created_at", { ascending: false });

    if (pending) {
      pendingCheckins = pending;
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
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
            <Badge variant="secondary" className="text-sm">
              {activity.type}
            </Badge>
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
      {isOrganizer && (
        <OrganizerPanel
          activityId={activity.id}
          pendingCheckins={pendingCheckins}
          occurrences={occurrencesList}
        />
      )}

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
