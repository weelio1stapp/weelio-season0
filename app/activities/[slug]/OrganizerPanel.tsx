"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, Plus, UserCheck, Calendar } from "lucide-react";
import { createOccurrence, confirmCheckin } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Occurrence = {
  id: string;
  starts_at: string;
};

type PendingCheckin = {
  id: string;
  occurrence_id: string;
  user_id: string;
  status: string;
  created_at: string;
  display_name?: string;
};

type Props = {
  activityId: string;
  pendingCheckins: PendingCheckin[];
  occurrences: Occurrence[];
};

export default function OrganizerPanel({ activityId, pendingCheckins, occurrences }: Props) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleCreateOccurrence = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);

    const formData = new FormData(e.currentTarget);
    const startsAt = formData.get("starts_at")?.toString() || "";

    try {
      const result = await createOccurrence(activityId, startsAt);

      if (result.success) {
        toast.success(result.message || "Běh vytvořen");
        setIsDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || "Chyba při vytváření běhu");
      }
    } catch (err) {
      console.error("Create occurrence error:", err);
      toast.error("Nastala chyba");
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmCheckin = async (checkinId: string) => {
    setConfirmingId(checkinId);

    try {
      const result = await confirmCheckin(checkinId);

      if (result.success) {
        toast.success(result.message || "Check-in potvrzen");
        router.refresh();
      } else {
        toast.error(result.message || "Chyba při potvrzení");
      }
    } catch (err) {
      console.error("Confirm checkin error:", err);
      toast.error("Nastala chyba");
    } finally {
      setConfirmingId(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("cs-CZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Group check-ins by occurrence
  const checkinsByOccurrence = pendingCheckins.reduce((acc, checkin) => {
    (acc[checkin.occurrence_id] ||= []).push(checkin);
    return acc;
  }, {} as Record<string, PendingCheckin[]>);

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <Shield className="w-5 h-5" />
          Panel organizátora
        </CardTitle>
        <CardDescription>Přidávej běhy a potvrzuj check-iny</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Add Occurrence */}
        <div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Přidat běh
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Přidat nový běh</DialogTitle>
                <DialogDescription>Zadej datum a čas nového běhu</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateOccurrence} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Datum a čas *</Label>
                  <Input id="starts_at" name="starts_at" type="datetime-local" required disabled={isCreating} />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>
                    Zrušit
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Vytvářím..." : "Vytvořit"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pending Check-ins */}
        {pendingCheckins.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Čekající check-iny ({pendingCheckins.length})
              </h3>

              <div className="space-y-4">
                {occurrences
                  .filter((occ) => checkinsByOccurrence[occ.id]?.length)
                  .map((occurrence) => {
                    const checkinsForOccurrence = checkinsByOccurrence[occurrence.id] || [];

                    return (
                      <div key={occurrence.id} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span className="font-medium">{formatDateTime(occurrence.starts_at)}</span>
                          <Badge variant="secondary" className="text-xs">
                            {checkinsForOccurrence.length}
                          </Badge>
                        </div>

                        <div className="space-y-2 pl-5">
                          {checkinsForOccurrence.map((checkin) => (
                            <div
                              key={checkin.id}
                              className="flex items-center justify-between gap-4 p-2 rounded-lg bg-background"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {checkin.display_name ?? `User ${checkin.user_id.slice(0, 8)}`}
                                </p>
                                <p className="text-xs text-muted-foreground">{formatDateTime(checkin.created_at)}</p>
                              </div>

                              <Button
                                size="sm"
                                onClick={() => handleConfirmCheckin(checkin.id)}
                                disabled={confirmingId === checkin.id}
                              >
                                {confirmingId === checkin.id ? "..." : "Potvrdit"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}