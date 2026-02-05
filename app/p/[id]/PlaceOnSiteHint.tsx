import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPin } from "lucide-react";

export default function PlaceOnSiteHint() {
  return (
    <Alert className="border-2">
      <MapPin className="h-5 w-5" />
      <AlertTitle className="text-base">Až budeš na místě</AlertTitle>
      <AlertDescription>
        Vrať se sem, potvrď návštěvu a zanech po sobě stopu.
      </AlertDescription>
    </Alert>
  );
}
