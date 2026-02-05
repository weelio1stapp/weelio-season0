"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Clock } from "lucide-react";
import { createCheckin } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Occurrence = {
  id: string;
  starts_at: string;
  ends_at: string | null;
  location_override_name: string | null;
  status: string;
};

type Checkin = {
  id: string;
  status: string;
  created_at: string;
};

type Props = {
  occurrences: Occurrence[];
  myCheckins: Record<string, Checkin>;
  isAuthenticated: boolean;
};

export default function OccurrencesList({
  occurrences,
  myCheckins,
  isAuthenticated,
}: Props) {
  const router = useRouter();
  const [loadingOccurrenceId, setLoadingOccurrenceId] = useState<string | null>(null);

  const handleCheckin = async (occurrenceId: string) => {
    if (!isAuthenticated) {
      toast.error("Musíš být přihlášený");
      return;
    }

    setLoadingOccurrenceId(occurrenceId);

    try {
      const result = await createCheckin(occurrenceId);

      if (result.success) {
        toast.success(result.message || "Check-in úspěšný");
        router.refresh();
      } else {
        toast.error(result.message || "Check-in se nezdařil");
      }
    } catch (err) {
      console.error("Check-in error:", err);
      toast.error("Nastala chyba");
    } finally {
      setLoadingOccurrenceId(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("cs-CZ", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Čeká na potvrzení</Badge>;
      case "confirmed":
        return <Badge className="bg-green-600 hover:bg-green-700">Potvrzeno</Badge>;
      case "rejected":
        return <Badge variant="destructive">Zamítnuto</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {occurrences.map((occurrence, index) => {
        const myCheckin = myCheckins[occurrence.id];
        const isPast = new Date(occurrence.starts_at) < new Date();
        const isCanceled = occurrence.status === "canceled";

        return (
          <div key={occurrence.id}>
            {index > 0 && <Separator className="my-4" />}

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                {/* Date & Time */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {formatDateTime(occurrence.starts_at)}
                  </span>
                  {isCanceled && (
                    <Badge variant="destructive" className="ml-2">
                      Zrušeno
                    </Badge>
                  )}
                  {isPast && !isCanceled && (
                    <Badge variant="outline" className="ml-2">
                      Proběhlo
                    </Badge>
                  )}
                </div>

                {/* Location Override */}
                {occurrence.location_override_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {occurrence.location_override_name}
                  </div>
                )}

                {/* Duration */}
                {occurrence.ends_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Konec: {formatDateTime(occurrence.ends_at)}
                  </div>
                )}

                {/* My Check-in Status */}
                {myCheckin && (
                  <div className="mt-2">
                    {getStatusBadge(myCheckin.status)}
                  </div>
                )}
              </div>

              {/* Check-in Button */}
              <div>
                {!isCanceled && !isPast && (
                  <Button
                    onClick={() => handleCheckin(occurrence.id)}
                    disabled={!!myCheckin || loadingOccurrenceId === occurrence.id}
                    size="sm"
                    variant={myCheckin ? "outline" : "default"}
                  >
                    {loadingOccurrenceId === occurrence.id
                      ? "..."
                      : myCheckin
                      ? "Checked-in"
                      : "Check-in"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
