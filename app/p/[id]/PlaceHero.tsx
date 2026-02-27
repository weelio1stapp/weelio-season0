import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLACE_TYPE_LABELS, PlaceType } from "@/lib/constants/placeTypes";
import { Clock, Zap } from "lucide-react";

type PlaceHeroProps = {
  name: string;
  area: string;
  type: PlaceType;
  time_min: number;
  difficulty: number;
  why: string;
  cover_public_url: string | null;
  sport_type?: "run" | "run_inline" | null;
  surface_type?: "asphalt" | "gravel" | "trail" | "mixed" | null;
};

export default function PlaceHero({
  name,
  area,
  type,
  time_min,
  difficulty,
  why,
  cover_public_url,
  sport_type,
  surface_type,
}: PlaceHeroProps) {
  return (
    <Card className="border-2">
      {/* Hero Image */}
      {cover_public_url && (
        <div className="w-full aspect-video md:aspect-[21/9] overflow-hidden rounded-t-lg">
          <img
            src={cover_public_url}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardContent className="pt-6 pb-6">
        {/* Title & Location */}
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{name}</h1>
        <p className="text-muted-foreground mb-4">{area}</p>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="secondary" className="gap-1">
            {PLACE_TYPE_LABELS[type]}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            {time_min} min
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Zap className="w-3 h-3" />
            {difficulty}/5
          </Badge>
          {sport_type === "run" && (
            <Badge variant="secondary">🏃 Běžecká trasa</Badge>
          )}
          {sport_type === "run_inline" && (
            <Badge variant="secondary">🛼 Vhodné i na inline</Badge>
          )}
          {surface_type === "asphalt" && (
            <Badge variant="secondary">Asfalt</Badge>
          )}
          {surface_type === "gravel" && (
            <Badge variant="secondary">Štěrk</Badge>
          )}
          {surface_type === "trail" && (
            <Badge variant="secondary">Lesní stezka</Badge>
          )}
          {surface_type === "mixed" && (
            <Badge variant="secondary">Smíšený</Badge>
          )}
        </div>

        {/* Description */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Proč jít
          </h3>
          <p className="text-sm leading-relaxed">{why}</p>
        </div>
      </CardContent>
    </Card>
  );
}
