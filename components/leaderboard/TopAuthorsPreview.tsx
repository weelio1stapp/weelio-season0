import type { TopAuthor } from "@/lib/db/leaderboard";
import type { Profile } from "@/lib/db/profiles";
import { formatUserDisplay } from "@/lib/db/profiles";
import Link from "next/link";

interface TopAuthorsPreviewProps {
  authors: TopAuthor[];
  profiles: Map<string, Profile>;
}

export default function TopAuthorsPreview({ authors, profiles }: TopAuthorsPreviewProps) {
  if (authors.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-[var(--text-secondary)]">
        Zatím nejsou žádní autoři
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {authors.map((author, index) => {
        const profile = profiles.get(author.user_id);
        const displayName = formatUserDisplay(author.user_id, profile);

        return (
          <Link
            key={author.user_id}
            href={`/u/${author.user_id}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* Rank Badge */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--color-earth)] flex items-center justify-center text-white font-bold text-sm">
              {index === 0 && "👑"}
              {index === 1 && "🥈"}
              {index === 2 && "🥉"}
            </div>

            {/* Author Avatar/Icon */}
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="flex-shrink-0 w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-xl">
                ✍️
              </div>
            )}

            {/* Name & Stats */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--text-primary)] truncate text-sm">
                {displayName}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {author.place_count} {author.place_count === 1 ? "místo" : author.place_count < 5 ? "místa" : "míst"}
              </p>
            </div>

            {/* Visits */}
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-[var(--accent-primary)]">
                {author.total_visits}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">návštěv</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
