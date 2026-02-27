export type GoalProgress = {
  totalKm: number;
  totalRuns: number;
  kmPct: number; // 0..1
  runsPct: number; // 0..1
  planPct: number; // 0..1 (totalRuns / plan_total_runs)
  elapsedDays: number;
  totalDays: number;
  timePct: number; // 0..1
  expectedKmByNow: number;
  expectedRunsByNow: number;
  deltaKm: number; // totalKm - expectedKmByNow
  deltaRuns: number; // totalRuns - expectedRunsByNow
  status: "ahead" | "on_track" | "behind";
  // Plan-based expectation (6 runs/week)
  expectedRunsByNow_plan: number;
  expectedKmByNow_plan: number;
  deltaRuns_plan: number;
  deltaKm_plan: number;
  status_plan: "ahead" | "on_track" | "behind";
};

type ComputeGoalProgressArgs = {
  goal: {
    target_distance_km: number;
    target_runs: number;
    plan_total_runs: number;
    period_start: string; // date (YYYY-MM-DD)
    period_end: string; // date (YYYY-MM-DD)
  };
  runs: Array<{ distance_km: number; ran_at: string }>;
  now?: Date;
};

/**
 * Clamp a number between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get difference in calendar days (inclusive)
 */
function differenceInCalendarDays(date1: Date, date2: Date): number {
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

/**
 * Get start of day
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Compute goal progress with detailed metrics
 */
export function computeGoalProgress(
  args: ComputeGoalProgressArgs
): GoalProgress {
  const { goal, runs, now = new Date() } = args;

  // Calculate totals from runs
  const totalKm = runs.reduce((sum, run) => sum + run.distance_km, 0);
  const totalRuns = runs.length;

  // Calculate percentages
  const kmPct = clamp(
    goal.target_distance_km > 0 ? totalKm / goal.target_distance_km : 0,
    0,
    1
  );
  const runsPct = clamp(
    goal.target_runs > 0 ? totalRuns / goal.target_runs : 0,
    0,
    1
  );
  const planPct = clamp(
    goal.plan_total_runs > 0 ? totalRuns / goal.plan_total_runs : 0,
    0,
    1
  );

  // Calculate time progress (inclusive days)
  const periodStart = startOfDay(new Date(goal.period_start));
  const periodEnd = endOfDay(new Date(goal.period_end));
  const nowDate = endOfDay(now);

  const totalDays =
    differenceInCalendarDays(periodEnd, periodStart) + 1;
  const elapsedDays = clamp(
    differenceInCalendarDays(nowDate, periodStart) + 1,
    0,
    totalDays
  );
  const timePct =
    totalDays === 0 ? 1 : clamp(elapsedDays / totalDays, 0, 1);

  // Calculate expected values by now
  const expectedKmByNow = goal.target_distance_km * timePct;
  const expectedRunsByNow = goal.target_runs * timePct;

  // Calculate deltas
  const deltaKm = totalKm - expectedKmByNow;
  const deltaRuns = totalRuns - expectedRunsByNow;

  // Determine status based on thresholds
  let status: "ahead" | "on_track" | "behind" = "on_track";
  const threshold = 0.05 * goal.target_distance_km;
  if (deltaKm >= threshold) {
    status = "ahead";
  } else if (deltaKm <= -threshold) {
    status = "behind";
  }

  // Plan-based expectation (6 runs per week)
  const weeksElapsed = elapsedDays / 7;
  const plannedRunsRaw = weeksElapsed * 6;

  // Round to 1 decimal place and clamp to [0, target_runs]
  const expectedRunsByNow_plan = Math.min(
    goal.target_runs,
    Math.max(0, Math.round(plannedRunsRaw * 10) / 10)
  );

  // Derive km expectation proportionally
  const expectedKmByNow_plan_raw =
    goal.target_runs > 0
      ? goal.target_distance_km * (expectedRunsByNow_plan / goal.target_runs)
      : 0;
  const expectedKmByNow_plan = Math.min(
    goal.target_distance_km,
    Math.max(0, Math.round(expectedKmByNow_plan_raw * 10) / 10)
  );

  // Calculate plan-based deltas
  const deltaRuns_plan = totalRuns - expectedRunsByNow_plan;
  const deltaKm_plan = totalKm - expectedKmByNow_plan;

  // Determine plan-based status
  let status_plan: "ahead" | "on_track" | "behind" = "on_track";
  if (deltaKm_plan >= threshold) {
    status_plan = "ahead";
  } else if (deltaKm_plan <= -threshold) {
    status_plan = "behind";
  }

  return {
    totalKm,
    totalRuns,
    kmPct,
    runsPct,
    planPct,
    elapsedDays,
    totalDays,
    timePct,
    expectedKmByNow,
    expectedRunsByNow,
    deltaKm,
    deltaRuns,
    status,
    expectedRunsByNow_plan,
    expectedKmByNow_plan,
    deltaRuns_plan,
    deltaKm_plan,
    status_plan,
  };
}
