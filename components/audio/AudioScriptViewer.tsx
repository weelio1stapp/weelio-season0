"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AudioSegmentRow } from "@/lib/db/audio-segments";
import type { RoutePoint } from "@/lib/db/route-points";

type Props = {
  introSegment: AudioSegmentRow | null;
  pointSegments: Map<string, AudioSegmentRow>;
  routePoints: RoutePoint[];
};

const POINT_TYPE_LABELS = {
  START: "Začátek",
  END: "Cíl",
  CHECKPOINT: "Zastávka",
  POI: "Zajímavost",
  TREASURE: "Poklad",
} as const;

export default function AudioScriptViewer({
  introSegment,
  pointSegments,
  routePoints,
}: Props) {
  const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set());

  const togglePoint = (pointId: string) => {
    setExpandedPoints((prev) => {
      const next = new Set(prev);
      if (next.has(pointId)) {
        next.delete(pointId);
      } else {
        next.add(pointId);
      }
      return next;
    });
  };

  const hasAnyContent = introSegment?.script_text || pointSegments.size > 0;

  if (!hasAnyContent) {
    return null; // Don't show if no content
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audio scénář trasy</CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            Audio zatím není přehrávatelné
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Intro segment */}
        {introSegment?.script_text && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">Úvod trasy</h4>
              <Badge variant="secondary" className="text-xs">
                Intro
              </Badge>
              {introSegment.estimated_sec && (
                <span className="text-xs text-muted-foreground">
                  ~{introSegment.estimated_sec}s
                </span>
              )}
            </div>
            {introSegment.title && (
              <p className="text-sm font-medium text-muted-foreground">
                {introSegment.title}
              </p>
            )}
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm whitespace-pre-wrap">
                {introSegment.script_text}
              </p>
            </div>
          </div>
        )}

        {/* Point segments */}
        {routePoints.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Body trasy</h4>
            <div className="space-y-2">
              {routePoints.map((point) => {
                const segment = pointSegments.get(point.id);
                if (!segment?.script_text) return null;

                const isExpanded = expandedPoints.has(point.id);

                return (
                  <div
                    key={point.id}
                    className="rounded-lg border bg-muted/30 overflow-hidden"
                  >
                    <button
                      onClick={() => togglePoint(point.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {POINT_TYPE_LABELS[point.kind]}
                        </Badge>
                        <span className="text-sm font-medium">
                          {point.title}
                        </span>
                        {segment.estimated_sec && (
                          <span className="text-xs text-muted-foreground">
                            ~{segment.estimated_sec}s
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {isExpanded ? "−" : "+"}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t">
                        <p className="text-sm whitespace-pre-wrap">
                          {segment.script_text}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">
            Toto je textový scénář připravený autorem. Generování a přehrávání
            audia bude doplněno v budoucí verzi.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
