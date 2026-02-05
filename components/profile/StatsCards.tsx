import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Flame, MapPin, Map, Target, TrendingUp } from "lucide-react";

type StatsCardsProps = {
  xp: number;
  streak_weeks: number;
  best_streak_weeks: number;
  walkerStats: {
    visit_count: number;
    unique_places: number;
  };
  authorStats: {
    place_count: number;
    total_visits: number;
  };
};

export default function StatsCards({
  xp,
  streak_weeks,
  best_streak_weeks,
  walkerStats,
  authorStats,
}: StatsCardsProps) {
  const level = Math.floor(xp / 100) + 1;

  const stats = [
    {
      label: "XP & Level",
      value: `${xp.toLocaleString("cs-CZ")} XP`,
      subtitle: `Level ${level}`,
      icon: Trophy,
      color: "text-yellow-600 dark:text-yellow-500",
    },
    {
      label: "Aktuální série",
      value: `${streak_weeks}`,
      subtitle: streak_weeks === 1 ? "týden" : "týdnů",
      icon: Flame,
      color: "text-orange-600 dark:text-orange-500",
    },
    {
      label: "Nejlepší série",
      value: `${best_streak_weeks}`,
      subtitle: best_streak_weeks === 1 ? "týden" : "týdnů",
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-500",
    },
    {
      label: "Celkové návštěvy",
      value: walkerStats.visit_count.toLocaleString("cs-CZ"),
      subtitle: "míst navštíveno",
      icon: Target,
      color: "text-green-600 dark:text-green-500",
    },
    {
      label: "Unikátní místa",
      value: walkerStats.unique_places.toLocaleString("cs-CZ"),
      subtitle: "různých míst",
      icon: MapPin,
      color: "text-purple-600 dark:text-purple-500",
    },
    {
      label: "Vytvořená místa",
      value: authorStats.place_count.toLocaleString("cs-CZ"),
      subtitle: `${authorStats.total_visits.toLocaleString("cs-CZ")} návštěv celkem`,
      icon: Map,
      color: "text-pink-600 dark:text-pink-500",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <Icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
