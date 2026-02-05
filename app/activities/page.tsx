import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";

type Activity = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  location_name: string | null;
  is_public: boolean;
  created_at: string;
};

export default async function ActivitiesPage() {
  const supabase = await getSupabaseServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch public activities
  const { data: activities, error } = await supabase
    .from("activities")
    .select("id, slug, title, description, type, location_name, is_public, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch activities error:", error);
  }

  const activityList = (activities || []) as Activity[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Aktivity</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pravidelné běžecké kluby a sportovní akce
          </p>
        </div>

        {user && (
          <Button asChild>
            <Link href="/activities/new">
              + Vytvořit aktivitu
            </Link>
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Nalezeno <span className="font-semibold">{activityList.length}</span>{" "}
          {activityList.length === 1 ? "aktivita" : activityList.length < 5 ? "aktivity" : "aktivit"}
        </p>
      </div>

      {/* Activities list */}
      {activityList.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-8">
              Zatím nejsou žádné veřejné aktivity. {user && "Buď první a vytvoř novou!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activityList.map((activity) => (
            <Card key={activity.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{activity.title}</CardTitle>
                    {activity.location_name && (
                      <CardDescription className="flex items-center gap-1 mt-2">
                        <MapPin className="w-4 h-4" />
                        {activity.location_name}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary">{activity.type}</Badge>
                </div>
              </CardHeader>

              <CardContent>
                {activity.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {activity.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(activity.created_at).toLocaleDateString("cs-CZ")}
                  </div>

                  <Button asChild variant="outline" size="sm">
                    <Link href={`/activities/${activity.slug}`}>
                      Detail
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
