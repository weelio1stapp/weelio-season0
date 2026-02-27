import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fetchMyGoals } from "@/lib/db/goals";

type GoalsHistoryProps = {
  currentGoalId?: string | null;
};

export default async function GoalsHistory({
  currentGoalId,
}: GoalsHistoryProps) {
  const goals = await fetchMyGoals();

  // Limit to last 10
  const recentGoals = goals.slice(0, 10);

  if (recentGoals.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Historie cílů</CardTitle>
          {currentGoalId && (
            <Link
              href="/me"
              className="text-sm text-primary hover:underline"
            >
              Zobrazit aktuální
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentGoals.map((goal, index) => {
            const periodStart = new Date(goal.period_start).toLocaleDateString(
              "cs-CZ",
              { day: "2-digit", month: "2-digit", year: "numeric" }
            );
            const periodEnd = new Date(goal.period_end).toLocaleDateString(
              "cs-CZ",
              { day: "2-digit", month: "2-digit", year: "numeric" }
            );

            const isSelected = currentGoalId === goal.id;

            return (
              <div key={goal.id}>
                {index > 0 && <Separator className="my-2" />}
                <Link
                  href={`/me?goalId=${goal.id}`}
                  className={`block rounded-lg p-3 transition-colors ${
                    isSelected
                      ? "bg-accent"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {goal.title}
                        </span>
                        <Badge
                          variant={goal.is_active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {goal.is_active ? "Aktivní" : "Ukončeno"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {periodStart} – {periodEnd}
                      </p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{goal.target_distance_km} km</span>
                        <span>{goal.target_runs} běhů</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
