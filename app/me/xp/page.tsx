import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { calculateLevelProgress } from "@/lib/xp";
import XpHistory from "@/components/profile/XpHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, TrendingUp } from "lucide-react";

export default async function XpPage() {
  const supabase = await getSupabaseServerClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch user progress
  const { data: progress } = await supabase
    .from("user_progress")
    .select("xp")
    .eq("user_id", user.id)
    .maybeSingle();

  const totalXp = progress?.xp || 0;
  const {
    currentLevel,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent,
  } = calculateLevelProgress(totalXp);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Moje XP</h1>
        <p className="text-sm text-muted-foreground">
          Sleduj svůj pokrok a historii získaných zkušenostních bodů
        </p>
      </div>

      {/* XP Summary Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total XP */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--accent-primary)] bg-opacity-10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[var(--accent-primary)]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Celkem XP</p>
                <p className="text-2xl font-bold">{totalXp.toLocaleString()}</p>
              </div>
            </div>

            {/* Current Level */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktuální level</p>
                <p className="text-2xl font-bold">Level {currentLevel}</p>
              </div>
            </div>

            {/* Progress to Next Level */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Pokrok na level {currentLevel + 1}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {xpInCurrentLevel} / {xpNeededForNextLevel} XP
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* XP History */}
      <XpHistory />
    </main>
  );
}
