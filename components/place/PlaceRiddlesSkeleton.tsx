import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlaceRiddlesSkeleton() {
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">Kešky na místě</CardTitle>
            <CardDescription>Vyřeš hádanky a získej XP body</CardDescription>
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Skeleton riddles */}
          {[1, 2].map((i) => (
            <div key={i} className="p-4 rounded-lg border bg-card">
              {/* Prompt + XP badge */}
              <div className="flex items-start justify-between mb-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-16 ml-3" />
              </div>

              {/* Input + Button */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
