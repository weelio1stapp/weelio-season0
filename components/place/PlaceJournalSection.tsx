"use client";

import { useState } from "react";
import Link from "next/link";
import QuickJournalModal from "@/components/journal/QuickJournalModal";

type JournalEntry = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
};

type PlaceJournalSectionProps = {
  placeId: string;
  journalEntries: JournalEntry[];
  profiles: Record<string, Profile>;
  isAuthenticated: boolean;
};

export default function PlaceJournalSection({
  placeId,
  journalEntries,
  profiles,
  isAuthenticated,
}: PlaceJournalSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Format user display - use display_name if available, otherwise fallback
  const formatUserDisplay = (userId: string, profile: Profile | null): string => {
    if (profile?.display_name) {
      return profile.display_name;
    }

    // Fallback: User abc...xyz
    if (userId.length <= 12) {
      return `User ${userId}`;
    }
    return `User ${userId.slice(0, 6)}...${userId.slice(-6)}`;
  };

  return (
    <div className="mt-6 rounded-2xl border p-6">
      {/* Header with button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Deník místa</h3>
        {isAuthenticated && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            Napsat zápis
          </button>
        )}
      </div>

      {/* Entries */}
      {journalEntries.length > 0 ? (
        <div className="space-y-4">
          {journalEntries.map((entry) => {
            const profile = profiles[entry.user_id] || null;
            const displayName = formatUserDisplay(entry.user_id, profile);
            const entryDate = new Date(entry.created_at);
            const formattedDate = entryDate.toLocaleDateString("cs-CZ", {
              day: "numeric",
              month: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={entry.id}
                className="p-4 rounded-lg border border-gray-200"
              >
                {/* Author info */}
                <div className="flex items-center gap-3 mb-3">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-lg ring-2 ring-gray-200">
                      👤
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {displayName}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {formattedDate}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                  {entry.content}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Zatím žádné veřejné zápisky k tomuto místu.
          </p>
          {isAuthenticated ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-block px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              Napsat první zápis
            </button>
          ) : (
            <Link
              href="/leaderboard"
              className="inline-block px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Přihlásit se
            </Link>
          )}
        </div>
      )}

      {/* Quick Add Modal */}
      <QuickJournalModal
        placeId={placeId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
