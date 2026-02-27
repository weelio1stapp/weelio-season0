import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { UserGoal } from "@/lib/db/goals";
import type { UserRun } from "@/lib/db/runs";
import CreateGoalDialog from "./CreateGoalDialog";
import DeactivateGoalButton from "./DeactivateGoalButton";

type GoalDashboardProps = {
  goal: UserGoal | null;
  runs: UserRun[];
};

export default function GoalDashboard({ goal, runs }: GoalDashboardProps) {
  // If no active goal, show create goal UI
  if (!goal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projekt Krysa 🐀</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Nemáš nastavený cíl.</p>
          <CreateGoalDialog />
        </CardContent>
      </Card>
    );
  }

  // Calculate progress
  const totalKm = runs.reduce((sum, run) => sum + run.distance_km, 0);
  const totalRuns = runs.length;

  const kmPct = Math.min((totalKm / goal.target_distance_km) * 100, 100);
  const runsPct = Math.min((totalRuns / goal.target_runs) * 100, 100);
  const planPct = Math.min((totalRuns / goal.plan_total_runs) * 100, 100);

  // Calculate time progress
  const today = new Date();
  const periodStart = new Date(goal.period_start);
  const periodEnd = new Date(goal.period_end);
  const totalDays = Math.max(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    1
  );
  const elapsedDays = Math.max(
    (today.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    0
  );
  const timePct = Math.min(Math.max(elapsedDays / totalDays, 0), 1);
  const delta = kmPct / 100 - timePct;

  let statusBadge: {
    label: string;
    variant: "default" | "secondary" | "destructive";
  } = {
    label: "Jedeš podle plánu",
    variant: "secondary",
  };
  if (delta >= 0.05) {
    statusBadge = { label: "Jsi napřed", variant: "default" };
  } else if (delta <= -0.05) {
    statusBadge = { label: "Jsi ve skluzu", variant: "destructive" };
  }

  // Format period for display
  const periodStartStr = new Date(goal.period_start).toLocaleDateString(
    "cs-CZ"
  );
  const periodEndStr = new Date(goal.period_end).toLocaleDateString("cs-CZ");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <CardTitle>Projekt Krysa 🐀</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            <CreateGoalDialog
              triggerLabel="Změnit cíl"
              existingGoal={{
                period_start: goal.period_start,
                period_end: goal.period_end,
                target_distance_km: goal.target_distance_km,
                target_runs: goal.target_runs,
                plan_total_runs: goal.plan_total_runs,
              }}
            />
            <DeactivateGoalButton />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period info */}
        <p className="text-sm text-muted-foreground">
          Období: {periodStartStr} → {periodEndStr}
        </p>

        <Separator />

        {/* Progress bars */}
        <div className="space-y-4">
          {/* Distance progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Kilometrů</span>
              <span className="text-muted-foreground">
                {totalKm.toFixed(1)} / {goal.target_distance_km} km
              </span>
            </div>
            <Progress value={kmPct} />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {kmPct.toFixed(0)}%
            </p>
          </div>

          {/* Runs progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Počet běhů</span>
              <span className="text-muted-foreground">
                {totalRuns} / {goal.target_runs}
              </span>
            </div>
            <Progress value={runsPct} />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {runsPct.toFixed(0)}%
            </p>
          </div>

          {/* Plan progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Splnění tréninků dle plánu</span>
              <span className="text-muted-foreground">
                {totalRuns} / {goal.plan_total_runs}
              </span>
            </div>
            <Progress value={planPct} />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {planPct.toFixed(0)}%
            </p>
          </div>
        </div>

        <Separator />

        {/* Recent runs */}
        <div>
          <h3 className="text-sm font-semibold mb-3">
            Posledních 5 běhů v období
          </h3>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Zatím žádný běh v tomto období.
            </p>
          ) : (
            <div className="space-y-2">
              {runs.slice(0, 5).map((run) => {
                const date = new Date(run.ran_at);
                const dateStr = date.toLocaleDateString("cs-CZ", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                const timeStr = date.toLocaleTimeString("cs-CZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                let paceStr = "";
                if (run.pace_sec_per_km) {
                  const paceMin = Math.floor(run.pace_sec_per_km / 60);
                  const paceSec = run.pace_sec_per_km % 60;
                  paceStr = `${paceMin}:${String(paceSec).padStart(
                    2,
                    "0"
                  )} /km`;
                }

                return (
                  <div
                    key={run.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {dateStr} {timeStr}
                      </span>
                      <div className="flex gap-3 text-muted-foreground">
                        <span>{run.distance_km} km</span>
                        {run.duration_min && <span>{run.duration_min} min</span>}
                        {paceStr && <span>{paceStr}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
