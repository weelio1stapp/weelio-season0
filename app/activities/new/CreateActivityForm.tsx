"use client";

import { useActionState } from "react";
import { createActivity, type ActionResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionResult = { success: false };

const ACTIVITY_TYPES = [
  { value: "run_club", label: "Běžecký klub" },
  { value: "cycling", label: "Cyklistika" },
  { value: "hiking", label: "Pěší túry" },
  { value: "other", label: "Jiné" },
];

export default function CreateActivityForm() {
  const [state, formAction, isPending] = useActionState(createActivity, initialState);

  const errors = state?.errors || {};
  const generalError = state?.message;

  return (
    <form action={formAction} className="space-y-6">
      {/* General error message */}
      {generalError && (
        <Alert variant="error">
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Název aktivity *</Label>
        <Input
          id="title"
          name="title"
          type="text"
          required
          disabled={isPending}
          placeholder="např. Prague Run Club"
        />
        {errors.title && (
          <p className="text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL) *</Label>
        <Input
          id="slug"
          name="slug"
          type="text"
          required
          disabled={isPending}
          placeholder="prague-run-club"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Pouze malá písmena, číslice a pomlčky (např. prague-run-club)
        </p>
        {errors.slug && (
          <p className="text-sm text-red-600">{errors.slug}</p>
        )}
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Typ aktivity</Label>
        <select
          id="type"
          name="type"
          disabled={isPending}
          defaultValue="run_club"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ACTIVITY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Popis</Label>
        <Textarea
          id="description"
          name="description"
          disabled={isPending}
          rows={4}
          placeholder="Krátký popis aktivity..."
        />
      </div>

      {/* Location Name */}
      <div className="space-y-2">
        <Label htmlFor="location_name">Místo</Label>
        <Input
          id="location_name"
          name="location_name"
          type="text"
          disabled={isPending}
          placeholder="např. Stromovka, Praha"
        />
      </div>

      {/* Coordinates - side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lat">Šířka (lat)</Label>
          <Input
            id="lat"
            name="lat"
            type="text"
            disabled={isPending}
            placeholder="50.0875"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lng">Délka (lng)</Label>
          <Input
            id="lng"
            name="lng"
            type="text"
            disabled={isPending}
            placeholder="14.4123"
            className="font-mono text-sm"
          />
        </div>
      </div>
      {errors.lat && (
        <p className="text-sm text-red-600">{errors.lat}</p>
      )}

      {/* Is Public */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_public"
          name="is_public"
          value="true"
          disabled={isPending}
          defaultChecked={true}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="is_public" className="cursor-pointer">
          Veřejná aktivita (viditelná pro všechny)
        </Label>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Vytvářím..." : "Vytvořit aktivitu"}
        </Button>
      </div>
    </form>
  );
}
