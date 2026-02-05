import type { TopPlace } from "@/lib/db/leaderboard";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin } from "lucide-react";

interface TopPlacesPreviewProps {
  places: TopPlace[];
}

export default function TopPlacesPreview({ places }: TopPlacesPreviewProps) {
  if (places.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Zatím nejsou žádné návštěvy
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {places.map((place, index) => {
        const isTop = index === 0;

        return (
          <div key={place.place_id}>
            {index > 0 && <Separator className="my-2" />}
            <Link
              href={`/p/${place.place_id}`}
              className={`flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors ${
                isTop ? "glass-chip-purple" : ""
              }`}
            >
              {/* Rank Badge */}
              <Badge variant={isTop ? "default" : "secondary"} className="w-8 h-8 flex items-center justify-center p-0 rounded-full">
                {index === 0 && "👑"}
                {index === 1 && "🥈"}
                {index === 2 && "🥉"}
              </Badge>

              {/* Thumbnail */}
              {place.thumbnail_url ? (
                <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border">
                  <img
                    src={place.thumbnail_url}
                    alt={place.place_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                </div>
              )}

              {/* Place info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate text-sm">
                  {place.place_name}
                </h3>
                <p className="text-xs text-muted-foreground truncate">{place.area}</p>
              </div>

              {/* Visits */}
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-primary">
                  {place.visit_count}
                </p>
                <p className="text-xs text-muted-foreground">návštěv</p>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
