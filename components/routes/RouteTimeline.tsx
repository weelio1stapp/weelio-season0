"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoutePoint } from "@/lib/db/route-points";

interface RouteTimelineProps {
  points: RoutePoint[];
  activePointId?: string | null;
  onSelectPoint?: (id: string) => void;
}

// Define badge variants and labels
const kindConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    color: string;
  }
> = {
  START: {
    label: "Začátek",
    variant: "default",
    color: "bg-green-500",
  },
  END: {
    label: "Cíl",
    variant: "default",
    color: "bg-red-500",
  },
  CHECKPOINT: {
    label: "Zastávka",
    variant: "secondary",
    color: "bg-blue-500",
  },
  POI: {
    label: "Zajímavé místo",
    variant: "outline",
    color: "bg-blue-400",
  },
  TREASURE: {
    label: "Poklad",
    variant: "destructive",
    color: "bg-yellow-500",
  },
};

export default function RouteTimeline({
  points,
  activePointId,
  onSelectPoint,
}: RouteTimelineProps) {
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  // Scroll to active point when it changes
  useEffect(() => {
    if (activePointId && itemRefs.current[activePointId]) {
      itemRefs.current[activePointId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activePointId]);

  if (points.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Trasa zatím nemá žádné body. Přidej START a CÍL v editaci.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Body na trase</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line connecting points */}
          <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-border" />

          {/* Route points list */}
          <ol className="space-y-6 relative">
            {points.map((point, index) => {
              const isActive = point.id === activePointId;
              const config = kindConfig[point.kind] || {
                label: point.kind,
                variant: "outline" as const,
                color: "bg-gray-500",
              };

              return (
                <li
                  key={point.id}
                  ref={(el) => {
                    itemRefs.current[point.id] = el;
                  }}
                  className={`relative pl-10 cursor-pointer transition-colors rounded-lg p-3 -ml-3 ${
                    isActive ? "bg-muted border-2 border-primary" : "hover:bg-muted/50"
                  }`}
                  onClick={() => onSelectPoint?.(point.id)}
                >
                  {/* Dot on the timeline */}
                  <div
                    className={`absolute left-0 top-4 w-[30px] h-[30px] rounded-full ${config.color} border-4 border-background z-10 flex items-center justify-center transition-transform ${
                      isActive ? "scale-110" : ""
                    }`}
                  >
                    <span className="text-white text-xs font-bold">
                      {index + 1}
                    </span>
                  </div>

                  {/* Point content */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {point.title && (
                        <span className="font-medium">{point.title}</span>
                      )}
                    </div>

                    {point.note && (
                      <p className="text-sm text-muted-foreground">
                        {point.note}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground font-mono">
                      {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
