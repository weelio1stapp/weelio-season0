"use client";

import PlaceForm from "@/components/PlaceForm";
import { createPlaceAction } from "./actions";

export default function CreatePlaceForm() {
  return (
    <PlaceForm
      action={createPlaceAction}
      submitLabel="Přidat místo"
    />
  );
}
