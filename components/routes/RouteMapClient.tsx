"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RoutePoint } from "@/lib/db/route-points";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface RouteMapClientProps {
  points: RoutePoint[];
  activePointId?: string | null;
  onSelectPoint?: (id: string) => void;
}

// Define colors for each point kind
const kindColors: Record<string, string> = {
  START: "#22c55e", // green
  END: "#ef4444", // red
  CHECKPOINT: "#3b82f6", // blue
  POI: "#3b82f6", // blue
  TREASURE: "#eab308", // gold
};

// Create custom colored icons
const createColoredIcon = (color: string, isActive = false) => {
  const size = isActive ? 32 : 24;
  const borderWidth = isActive ? 4 : 3;
  const shadow = isActive
    ? "0 4px 8px rgba(0,0,0,0.4), 0 0 0 3px rgba(59, 130, 246, 0.3)"
    : "0 2px 4px rgba(0,0,0,0.3)";

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: ${color};
      border: ${borderWidth}px solid white;
      box-shadow: ${shadow};
      transition: all 0.2s ease;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Custom Marker component with auto-open popup
function InteractiveMarker({
  point,
  isActive,
  onClick,
}: {
  point: RoutePoint;
  isActive: boolean;
  onClick: () => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const color = kindColors[point.kind] || "#6b7280";
  const icon = createColoredIcon(color, isActive);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    if (isActive) {
      marker.openPopup();
    } else {
      marker.closePopup();
    }
  }, [isActive]);

  return (
    <Marker
      ref={markerRef}
      position={[point.lat, point.lng]}
      icon={icon}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Popup>
        <div className="text-sm">
          <p className="font-semibold">{point.title || point.kind}</p>
          {point.note && (
            <p className="text-muted-foreground text-xs mt-1">{point.note}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

export default function RouteMapClient({
  points,
  activePointId,
  onSelectPoint,
}: RouteMapClientProps) {
  if (points.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Žádné body trasy k zobrazení</p>
      </div>
    );
  }

  // Calculate center and bounds
  const latitudes = points.map((p) => p.lat);
  const longitudes = points.map((p) => p.lng);
  const centerLat = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const centerLng = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;

  // Prepare polyline coordinates
  const polylinePositions: [number, number][] = points.map((p) => [p.lat, p.lng]);

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Draw polyline */}
        <Polyline
          positions={polylinePositions}
          pathOptions={{ color: "#3b82f6", weight: 3, opacity: 0.7 }}
        />

        {/* Draw markers */}
        {points.map((point) => (
          <InteractiveMarker
            key={point.id}
            point={point}
            isActive={point.id === activePointId}
            onClick={() => onSelectPoint?.(point.id)}
          />
        ))}
      </MapContainer>
    </div>
  );
}
