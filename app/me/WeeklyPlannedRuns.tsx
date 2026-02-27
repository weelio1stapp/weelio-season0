import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchMyPlannedRunsInDateRangeAll } from "@/lib/db/runPlans";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PlannedRunCardWithCompletion from "./PlannedRunCardWithCompletion";

/**
 * Get start of today and end of this week (Sunday)
 */
function getThisWeekRange(): { start: string; end: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Find end of week (Sunday)
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + daysUntilSunday);

  // Format as YYYY-MM-DD
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    start: formatDate(today),
    end: formatDate(endOfWeek),
  };
}

export default async function WeeklyPlannedRuns() {
  const { start, end } = getThisWeekRange();
  const allPlannedRuns = await fetchMyPlannedRunsInDateRangeAll(start, end);

  // Filter into planned and done-future
  const plannedRuns = allPlannedRuns.filter((p) => p.status === "planned");
  const doneFuturePlans = allPlannedRuns.filter(
    (p) => p.status === "done" && p.completed_run_id === null
  );

  if (plannedRuns.length === 0 && doneFuturePlans.length === 0) {
    return null; // Don't show the card if no planned runs
  }

  // Fetch place names for all planned runs
  const supabase = await getSupabaseServerClient();
  const placeIds = [...new Set(allPlannedRuns.map((p) => p.place_id))];

  const { data: places } = await supabase
    .from("places")
    .select("id, name")
    .in("id", placeIds);

  const placeNamesMap = new Map(
    places?.map((p) => [p.id, p.name]) ?? []
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tento týden mě čeká</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Active planned runs */}
          {plannedRuns.length > 0 && (
            <div className="space-y-3">
              {plannedRuns.map((plan) => {
                const placeName =
                  placeNamesMap.get(plan.place_id) || "Neznámé místo";

                return (
                  <div key={plan.id} className="space-y-2">
                    <Link
                      href={`/p/${plan.place_id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Místo: {placeName}
                    </Link>
                    <PlannedRunCardWithCompletion plan={plan} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Done future plans */}
          {doneFuturePlans.length > 0 && (
            <>
              {plannedRuns.length > 0 && <Separator />}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">
                  Hotovo (naplánováno dopředu)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Označeno jako splněné. Po dosažení data se běh vytvoří automaticky při další návštěvě.
                </p>
                {doneFuturePlans.map((plan) => {
                  const placeName =
                    placeNamesMap.get(plan.place_id) || "Neznámé místo";
                  const plannedDate = new Date(plan.planned_at);
                  const plannedDateStr = plannedDate.toLocaleDateString(
                    "cs-CZ",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }
                  );
                  const plannedTimeStr = plannedDate.toLocaleTimeString(
                    "cs-CZ",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );

                  return (
                    <div key={plan.id} className="space-y-2">
                      <Link
                        href={`/p/${plan.place_id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Místo: {placeName}
                      </Link>
                      <div className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {plannedDateStr} {plannedTimeStr}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              Čeká na datum
                            </Badge>
                          </div>
                          <div className="flex gap-3 text-muted-foreground">
                            <span>{plan.distance_km} km</span>
                            {plan.target_duration_min && (
                              <span>cíl: {plan.target_duration_min} min</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
