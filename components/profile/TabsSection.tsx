import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Map, TrendingUp, Calendar, MapPin } from "lucide-react";
import ChallengesCard from "@/components/leaderboard/ChallengesCard";
import MyJournalList from "@/components/journal/MyJournalList";

type TabsSectionProps = {
  season: {
    id: string;
    name: string;
    starts_at: string;
    ends_at: string;
  } | null;
  challenges: Array<{
    id: string;
    season_id: string;
    title: string;
    description: string | null;
    kind: "unique_places" | "visits" | "authored_places";
    target: number;
  }>;
  progress: Array<{
    challenge_id: string;
    current: number;
    target: number;
  }>;
  journalEntries: Array<{
    id: string;
    place_id: string | null;
    content: string;
    visibility: string;
    created_at: string;
  }>;
  placeNames: Record<string, string>;
  authoredPlaces: Array<{
    id: string;
    name: string;
    area: string;
    type?: string;
    cover_public_url?: string | null;
    visit_count: number;
  }>;
};

export default function TabsSection({
  season,
  challenges,
  progress,
  journalEntries,
  placeNames,
  authoredPlaces,
}: TabsSectionProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview" className="gap-2">
          <TrendingUp className="w-4 h-4" />
          Přehled
        </TabsTrigger>
        <TabsTrigger value="journal" className="gap-2">
          <BookOpen className="w-4 h-4" />
          Deník
        </TabsTrigger>
        <TabsTrigger value="places" className="gap-2">
          <Map className="w-4 h-4" />
          Moje místa
        </TabsTrigger>
      </TabsList>

      {/* Tab 1: Overview - Season & Challenges */}
      <TabsContent value="overview" className="space-y-6">
        {/* Season Info */}
        {season && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Aktuální sezóna
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{season.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(season.starts_at).toLocaleDateString("cs-CZ")} –{" "}
                  {new Date(season.ends_at).toLocaleDateString("cs-CZ")}
                </p>
                <Badge variant="default">Aktivní</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Challenges */}
        {challenges.length > 0 && (
          <ChallengesCard
            season={season}
            challenges={challenges}
            progress={progress}
            isAuthenticated={true}
          />
        )}

        {!season && challenges.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Momentálně nejsou aktivní žádné výzvy.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Tab 2: Journal */}
      <TabsContent value="journal" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Můj deník</CardTitle>
            <Button asChild size="sm">
              <Link href="/journal/new">Nový zápis</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {journalEntries.length > 0 ? (
              <MyJournalList entries={journalEntries} placeNames={placeNames} />
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Zatím nemáš žádné záznamy v deníku.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/journal/new">Vytvořit první zápis</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab 3: My Places */}
      <TabsContent value="places" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Moje místa</CardTitle>
            <Button asChild size="sm">
              <Link href="/places/new">Přidat místo</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {authoredPlaces.length > 0 ? (
              <div className="space-y-3">
                {authoredPlaces.map((place) => (
                  <Link
                    key={place.id}
                    href={`/p/${place.id}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-4 p-4 rounded-lg border-2 hover:border-primary transition-colors">
                      {/* Cover Image */}
                      {place.cover_public_url ? (
                        <img
                          src={place.cover_public_url}
                          alt={place.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                          {place.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>📍 {place.area}</span>
                          {place.type && (
                            <>
                              <span>•</span>
                              <span>{place.type}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Visit count */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          {place.visit_count}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {place.visit_count === 1
                            ? "návštěva"
                            : place.visit_count < 5
                            ? "návštěvy"
                            : "návštěv"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Zatím jsi nevytvořil žádná místa.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/places/new">Vytvořit první místo</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
