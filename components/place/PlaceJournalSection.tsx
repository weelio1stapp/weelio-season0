"use client";

import { useState } from "react";
import Link from "next/link";
import { NotebookPen, MoreVertical, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import QuickJournalModal from "@/components/journal/QuickJournalModal";
import ReportDialog from "@/components/moderation/ReportDialog";
import { copy } from "@/lib/copy";

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
  currentUserId?: string | null;
};

export default function PlaceJournalSection({
  placeId,
  journalEntries,
  profiles,
  isAuthenticated,
  currentUserId,
}: PlaceJournalSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

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
    <>
      <section id="place-journal" className="scroll-mt-24">
        <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{copy.journal.placeSection.title}</CardTitle>
              <CardDescription>
                {copy.journal.placeSection.description}
              </CardDescription>
            </div>
            {isAuthenticated && (
              <Button onClick={() => setIsModalOpen(true)} size="sm">
                {copy.journal.placeSection.addButton}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
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
                    className="p-4 rounded-lg border bg-card"
                  >
                    {/* Author info */}
                    <div className="flex items-center gap-3 mb-3">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-lg ring-2 ring-border">
                          👤
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formattedDate}
                        </p>
                      </div>

                      {/* Actions - show report for authenticated users */}
                      {isAuthenticated && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setReportTargetId(entry.id);
                                setReportDialogOpen(true);
                              }}
                            >
                              <Flag className="w-4 h-4 mr-2" />
                              Nahlásit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg bg-muted/40">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                <NotebookPen className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-center mb-1">
                {copy.journal.placeSection.emptyTitle}
              </p>
              <p className="text-sm text-muted-foreground text-center mb-6">
                {copy.journal.placeSection.emptyDesc}
              </p>
              {isAuthenticated ? (
                <Button onClick={() => setIsModalOpen(true)}>
                  {copy.journal.placeSection.addFirstButton}
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link href="/leaderboard">{copy.common.login}</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </section>

      {/* Quick Add Modal */}
      <QuickJournalModal
        placeId={placeId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Report Dialog */}
      {reportTargetId && (
        <ReportDialog
          isOpen={reportDialogOpen}
          onClose={() => {
            setReportDialogOpen(false);
            setReportTargetId(null);
          }}
          targetType="journal_entry"
          targetId={reportTargetId}
          targetLabel="tento zápis"
        />
      )}
    </>
  );
}
