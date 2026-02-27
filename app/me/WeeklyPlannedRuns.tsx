import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchMyPlannedRunsInDateRange } from "@/lib/db/runPlans";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
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
  const plannedRuns = await fetchMyPlannedRunsInDateRange(start, end);

  if (plannedRuns.length === 0) {
    return null; // Don't show the card if no planned runs
  }

  // Fetch place names for all planned runs
  const supabase = await getSupabaseServerClient();
  const placeIds = [...new Set(plannedRuns.map((p) => p.place_id))];

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
        <div className="space-y-3">
          {plannedRuns.map((plan) => {
            const placeName = placeNamesMap.get(plan.place_id) || "Neznámé místo";

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
      </CardContent>
    </Card>
  );
}
