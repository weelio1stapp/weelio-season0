import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2 } from "lucide-react";

type ProfileHeaderProps = {
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  email: string;
  authorStats: {
    place_count: number;
    total_visits: number;
  };
  walkerStats: {
    visit_count: number;
    unique_places: number;
  };
};

function formatUserDisplay(profile: ProfileHeaderProps["profile"]): string {
  return profile?.display_name || "Anonym";
}

function getAuthorBadge(placeCount: number, totalVisits: number) {
  if (placeCount >= 50 && totalVisits >= 500)
    return { label: "Legendární autor", variant: "default" as const };
  if (placeCount >= 20 && totalVisits >= 200)
    return { label: "Expert autor", variant: "default" as const };
  if (placeCount >= 10 && totalVisits >= 100)
    return { label: "Pokročilý autor", variant: "secondary" as const };
  if (placeCount >= 5 && totalVisits >= 50)
    return { label: "Autor", variant: "secondary" as const };
  if (placeCount >= 1) return { label: "Začínající autor", variant: "outline" as const };
  return null;
}

function getWalkerBadge(visitCount: number, uniquePlaces: number) {
  if (visitCount >= 500 && uniquePlaces >= 100)
    return { label: "Legendární chodec", variant: "default" as const };
  if (visitCount >= 200 && uniquePlaces >= 50)
    return { label: "Expert chodec", variant: "default" as const };
  if (visitCount >= 100 && uniquePlaces >= 25)
    return { label: "Pokročilý chodec", variant: "secondary" as const };
  if (visitCount >= 50 && uniquePlaces >= 10)
    return { label: "Chodec", variant: "secondary" as const };
  if (visitCount >= 10) return { label: "Začínající chodec", variant: "outline" as const };
  return null;
}

export default function ProfileHeader({
  profile,
  email,
  authorStats,
  walkerStats,
}: ProfileHeaderProps) {
  const displayName = formatUserDisplay(profile);
  const authorBadge = getAuthorBadge(
    authorStats.place_count,
    authorStats.total_visits
  );
  const walkerBadge = getWalkerBadge(
    walkerStats.visit_count,
    walkerStats.unique_places
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <Avatar className="w-24 h-24 ring-4 ring-muted">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-400 text-4xl">
              👤
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 space-y-3">
            {/* Name + Badges */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{displayName}</h1>
              <div className="flex flex-wrap gap-2">
                {authorBadge && (
                  <Badge
                    variant={authorBadge.variant}
                    className={authorBadge.variant === "default" ? "glass-chip-purple" : ""}
                  >
                    {authorBadge.label}
                  </Badge>
                )}
                {walkerBadge && (
                  <Badge
                    variant={walkerBadge.variant}
                    className={walkerBadge.variant === "default" ? "glass-chip-purple" : ""}
                  >
                    {walkerBadge.label}
                  </Badge>
                )}
              </div>
            </div>

            {/* Email */}
            <p className="text-sm text-muted-foreground">{email}</p>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button variant="glassPurple" asChild>
                <Link href="/me/edit">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Upravit profil
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/leaderboard">← Zpět na žebříčky</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
