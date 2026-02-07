"use client";

import dynamic from "next/dynamic";
import type { RoutePoint } from "@/lib/db/route-points";

// Dynamic import with SSR disabled for Leaflet
const RouteMapClient = dynamic(() => import("./RouteMapClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-muted rounded-lg animate-pulse">
      <p className="text-muted-foreground">Načítám mapu...</p>
    </div>
  ),
});

interface RouteMapProps {
  points: RoutePoint[];
  activePointId?: string | null;
  onSelectPoint?: (id: string) => void;
}

export default function RouteMap({
  points,
  activePointId,
  onSelectPoint,
}: RouteMapProps) {
  return (
    <RouteMapClient
      points={points}
      activePointId={activePointId}
      onSelectPoint={onSelectPoint}
    />
  );
}
