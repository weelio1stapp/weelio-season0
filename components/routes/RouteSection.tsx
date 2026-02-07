"use client";

import { useState } from "react";
import RouteMap from "./RouteMap";
import RouteTimeline from "./RouteTimeline";
import type { RoutePoint } from "@/lib/db/route-points";

interface RouteSectionProps {
  points: RoutePoint[];
}

export default function RouteSection({ points }: RouteSectionProps) {
  const [activePointId, setActivePointId] = useState<string | null>(null);

  return (
    <>
      {/* Route Map */}
      <div className="mb-6">
        <RouteMap
          points={points}
          activePointId={activePointId}
          onSelectPoint={setActivePointId}
        />
      </div>

      {/* Route Timeline */}
      <div className="mb-6">
        <RouteTimeline
          points={points}
          activePointId={activePointId}
          onSelectPoint={setActivePointId}
        />
      </div>
    </>
  );
}
