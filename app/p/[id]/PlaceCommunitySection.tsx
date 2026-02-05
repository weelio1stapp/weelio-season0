"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, BookOpen } from "lucide-react";
import PlaceJournalSection from "@/components/place/PlaceJournalSection";

type PlaceCommunitySectionProps = {
  placeId: string;
  journalEntries: Array<{
    id: string;
    user_id: string;
    content: string;
    created_at: string;
  }>;
  profiles: Record<
    string,
    { display_name: string | null; avatar_url: string | null }
  >;
  isAuthenticated: boolean;
};

export default function PlaceCommunitySection({
  placeId,
  journalEntries,
  profiles,
  isAuthenticated,
}: PlaceCommunitySectionProps) {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Komunita</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="journal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="journal" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Deník místa
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-2">
              <Camera className="w-4 h-4" />
              Fotky
            </TabsTrigger>
          </TabsList>

          <TabsContent value="journal" className="mt-4">
            <PlaceJournalSection
              placeId={placeId}
              journalEntries={journalEntries}
              profiles={profiles}
              isAuthenticated={isAuthenticated}
            />
          </TabsContent>

          <TabsContent value="photos" className="mt-4">
            <div className="text-center py-12">
              <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                Galerie fotek bude brzy k dispozici
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
