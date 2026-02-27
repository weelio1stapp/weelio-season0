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
import { computeGoalProgress } from "@/lib/goals/goalProgress";
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

  // Calculate progress using goal computation layer
  const progress = computeGoalProgress({
    goal: {
      target_distance_km: goal.target_distance_km,
      target_runs: goal.target_runs,
      plan_total_runs: goal.plan_total_runs,
      period_start: goal.period_start,
      period_end: goal.period_end,
    },
    runs: runs.map((r) => ({
      distance_km: r.distance_km,
      ran_at: r.ran_at,
    })),
  });

  // Convert to percentages for UI
  const kmPct = progress.kmPct * 100;
  const runsPct = progress.runsPct * 100;
  const planPct = progress.planPct * 100;
  const totalKm = progress.totalKm;
  const totalRuns = progress.totalRuns;

  // Map status to badge
  let statusBadge: {
    label: string;
    variant: "default" | "secondary" | "destructive";
  } = {
    label: "Jedeš podle plánu",
    variant: "secondary",
  };
  if (progress.status === "ahead") {
    statusBadge = { label: "Jsi napřed", variant: "default" };
  } else if (progress.status === "behind") {
    statusBadge = { label: "Jsi ve skluzu", variant: "destructive" };
  }

  // Map plan status to badge
  let planStatusBadge: {
    label: string;
    variant: "default" | "secondary" | "destructive";
  } = {
    label: "Plán: podle plánu",
    variant: "secondary",
  };
  if (progress.status_plan === "ahead") {
    planStatusBadge = { label: "Plán: napřed", variant: "default" };
  } else if (progress.status_plan === "behind") {
    planStatusBadge = { label: "Plán: skluz", variant: "destructive" };
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
            <Badge variant={planStatusBadge.variant} className="text-xs">
              {planStatusBadge.label}
            </Badge>
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

        {/* Cílovník (Target Tracker) */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Cílovník</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dnes máš mít (časově):</span>
              <span className="font-medium">
                {progress.expectedKmByNow.toFixed(1)} km, {progress.expectedRunsByNow.toFixed(1)} běhů
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dnes máš mít (plán 6/týden):</span>
              <span className="font-medium">
                {progress.expectedKmByNow_plan.toFixed(1)} km, {progress.expectedRunsByNow_plan.toFixed(1)} běhů
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Máš hotovo:</span>
              <span className="font-medium">
                {totalKm.toFixed(1)} km, {totalRuns} běhů
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rozdíl (časově):</span>
              <span className={`font-medium ${progress.deltaKm >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {progress.deltaKm >= 0 ? '+' : ''}{progress.deltaKm.toFixed(1)} km, {progress.deltaRuns >= 0 ? '+' : ''}{progress.deltaRuns.toFixed(1)} běhů
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rozdíl (plán):</span>
              <span className={`font-medium ${progress.deltaKm_plan >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {progress.deltaKm_plan >= 0 ? '+' : ''}{progress.deltaKm_plan.toFixed(1)} km, {progress.deltaRuns_plan >= 0 ? '+' : ''}{progress.deltaRuns_plan.toFixed(1)} běhů
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tempo plnění:</span>
              <span className="font-medium">
                km {(progress.kmPct * 100).toFixed(0)}% vs čas {(progress.timePct * 100).toFixed(0)}%
              </span>
            </div>
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
