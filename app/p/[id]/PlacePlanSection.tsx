import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, Map } from "lucide-react";

type PlacePlanSectionProps = {
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
};

/**
 * Format coordinate for Mapy.com route planner
 */
function formatMapyCoord(lat: number, lng: number): string {
  const latAbs = Math.abs(lat);
  const lngAbs = Math.abs(lng);
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${latAbs}${latDir}, ${lngAbs}${lngDir}`;
}

/**
 * Build Mapy.com route planner URL
 */
function getMapyRouteUrl(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): string {
  const startCoord = formatMapyCoord(startLat, startLng);
  const endCoord = formatMapyCoord(endLat, endLng);
  const rtStart = encodeURIComponent(startCoord);
  const rtEnd = encodeURIComponent(endCoord);
  return `https://mapy.com/cs/?planovani-trasy=&rs=coor&rs=coor&rt=${rtStart}&rt=${rtEnd}&x=${startLng}&y=${startLat}&z=14`;
}

export default function PlacePlanSection({
  start_lat,
  start_lng,
  end_lat,
  end_lng,
}: PlacePlanSectionProps) {
  // If no coordinates, show a placeholder
  if (!start_lat || !start_lng || !end_lat || !end_lng) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Jak se sem dostat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Souřadnice nejsou k dispozici.
          </p>
        </CardContent>
      </Card>
    );
  }

  const mapyUrl = getMapyRouteUrl(start_lat, start_lng, end_lat, end_lng);
  const googleUrl = `https://www.google.com/maps/dir/${start_lat},${start_lng}/${end_lat},${end_lng}`;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Jak se sem dostat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coordinates Info */}
        <div className="text-sm space-y-1">
          <p className="text-muted-foreground">
            <span className="font-medium">Start:</span>{" "}
            {start_lat.toFixed(5)}, {start_lng.toFixed(5)}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium">Cíl:</span>{" "}
            {end_lat.toFixed(5)}, {end_lng.toFixed(5)}
          </p>
        </div>

        {/* Primary Navigation CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg" className="flex-1">
            <a
              href={mapyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Map className="w-5 h-5 mr-2" />
              Navigovat (Mapy.cz)
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="flex-1">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation className="w-5 h-5 mr-2" />
              Google Maps
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
