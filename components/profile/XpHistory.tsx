"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, MapPin, Trophy, BookOpen, Zap } from "lucide-react";

type XpEvent = {
  id: string;
  source: string;
  source_id: string;
  xp_delta: number;
  created_at: string;
};

type SourceFilter = "all" | "riddle" | "visit" | "challenge" | "journal";

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  riddle: <Award className="w-4 h-4" />,
  visit: <MapPin className="w-4 h-4" />,
  challenge: <Trophy className="w-4 h-4" />,
  journal: <BookOpen className="w-4 h-4" />,
};

const SOURCE_LABELS: Record<string, string> = {
  riddle: "Keška vyřešena",
  visit: "Návštěva místa",
  challenge: "Výzva dokončena",
  journal: "Zápis do deníku",
};

export default function XpHistory() {
  const [events, setEvents] = useState<XpEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [source, setSource] = useState<SourceFilter>("all");

  useEffect(() => {
    fetchEvents(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  async function fetchEvents(reset: boolean = false) {
    if (reset) {
      setLoading(true);
      setEvents([]);
      setNextCursor(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        limit: "20",
        source,
      });

      if (!reset && nextCursor) {
        params.append("cursor", nextCursor);
      }

      const response = await fetch(`/api/xp/events?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodařilo se načíst XP historii");
      }

      if (reset) {
        setEvents(data.events || []);
      } else {
        setEvents((prev) => [...prev, ...(data.events || [])]);
      }

      setNextCursor(data.next_cursor);
    } catch (err: any) {
      console.error("Fetch XP events error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Před chvílí";
    if (diffMins < 60) return `Před ${diffMins} min`;
    if (diffHours < 24) return `Před ${diffHours} h`;
    if (diffDays < 7) return `Před ${diffDays} dny`;

    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  const filters: { value: SourceFilter; label: string }[] = [
    { value: "all", label: "Vše" },
    { value: "riddle", label: "Kešky" },
    { value: "visit", label: "Návštěvy" },
    { value: "journal", label: "Deník" },
    { value: "challenge", label: "Výzvy" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--accent-primary)]" />
          Historie XP
        </CardTitle>

        {/* Filters */}
        <div className="flex gap-2 pt-2 flex-wrap">
          {filters.map((filter) => (
            <Button
              key={filter.value}
              variant={source === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSource(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Zap className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              Zatím nemáš žádné XP{source !== "all" && ` z kategorie "${filters.find((f) => f.value === source)?.label}"`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Získej XP vyřešením kešek, návštěvou míst nebo psaním do deníku
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-0">
              {events.map((event, index) => (
                <div key={event.id}>
                  {index > 0 && <Separator className="my-2" />}
                  <div className="flex items-center gap-3 py-2">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-primary)] bg-opacity-10 flex items-center justify-center text-[var(--accent-primary)]">
                      {SOURCE_ICONS[event.source] || <Zap className="w-4 h-4" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {SOURCE_LABELS[event.source] || event.source}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(event.created_at)}
                      </p>
                    </div>

                    {/* XP Badge */}
                    <Badge variant="secondary" className="flex-shrink-0">
                      +{event.xp_delta} XP
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {nextCursor && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => fetchEvents(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Načítání..." : "Načíst další"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
