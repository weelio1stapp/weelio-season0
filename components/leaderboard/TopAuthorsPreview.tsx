import type { TopAuthor } from "@/lib/db/leaderboard";
import type { Profile } from "@/lib/db/profiles";
import { formatUserDisplay } from "@/lib/db/profiles";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TopAuthorsPreviewProps {
  authors: TopAuthor[];
  profiles: Map<string, Profile>;
}

export default function TopAuthorsPreview({ authors, profiles }: TopAuthorsPreviewProps) {
  if (authors.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Zatím nejsou žádní autoři
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {authors.map((author, index) => {
        const profile = profiles.get(author.user_id);
        const displayName = formatUserDisplay(author.user_id, profile);
        const isTop = index === 0;

        return (
          <div key={author.user_id}>
            {index > 0 && <Separator className="my-2" />}
            <Link
              href={`/u/${author.user_id}`}
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

              {/* Author Avatar */}
              <Avatar className="w-10 h-10">
                <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-400 text-xl">
                  ✍️
                </AvatarFallback>
              </Avatar>

              {/* Name & Stats */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate text-sm">
                  {displayName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {author.place_count} {author.place_count === 1 ? "místo" : author.place_count < 5 ? "místa" : "míst"}
                </p>
              </div>

              {/* Visits */}
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-primary">
                  {author.total_visits}
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
