import { Badge } from "@/components/ui/badge";

type LeaderboardHeaderProps = {
  seasonName?: string | null;
};

export default function LeaderboardHeader({ seasonName }: LeaderboardHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Žebříčky</h1>
          <p className="text-muted-foreground mt-2">
            Nejlepší průzkumníci, nejoblíbenější místa a mnoho dalšího
          </p>
        </div>
        {seasonName && (
          <Badge variant="secondary" className="text-sm">
            {seasonName}
          </Badge>
        )}
      </div>
    </div>
  );
}
