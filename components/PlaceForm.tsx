"use client";

import { useActionState } from "react";
import Button from "@/components/Button";
import type { PlaceRow } from "@/lib/db/places";

const PLACE_TYPES = [
  { value: "other", label: "Jiné" },
  { value: "urban_walk", label: "Městská procházka" },
  { value: "nature_walk", label: "Přírodní túra" },
  { value: "viewpoint", label: "Vyhlídka" },
  { value: "park_forest", label: "Park / Les" },
  { value: "industrial", label: "Industriál" },
  { value: "lake_river", label: "Jezero / Řeka" },
] as const;

type ActionResult = {
  success: boolean;
  errors?: Record<string, string>;
  message?: string;
};

type Props = {
  initialData?: PlaceRow;
  action: (
    prevState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  submitLabel: string;
};

const initialState: ActionResult = { success: false };

export default function PlaceForm({
  initialData,
  action,
  submitLabel,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const errors = state?.errors || {};
  const generalError = state?.message;

  // Helper to format coordinates for display
  const formatCoords = (lat?: number, lng?: number) => {
    if (lat === undefined || lng === undefined) return "";
    return `${lat}, ${lng}`;
  };

  return (
    <form action={formAction} className="space-y-6">
      {/* General error message */}
      {generalError && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {generalError}
        </div>
      )}

      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
        >
          Název místa *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          disabled={isPending}
          defaultValue={initialData?.name}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="např. Sněžka, Pustevny"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Route Title */}
      <div>
        <label
          htmlFor="route_title"
          className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
        >
          Název trasy *
        </label>
        <input
          type="text"
          id="route_title"
          name="route_title"
          required
          disabled={isPending}
          defaultValue={initialData?.route_title || ""}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Např. Na Pramen Labe od potoka za chalupou"
        />
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Tvoje osobní pojmenování cesty. Cíl je místo, ale trasa je tvoje.
        </p>
        {errors.route_title && (
          <p className="mt-1 text-sm text-red-600">{errors.route_title}</p>
        )}
      </div>

      {/* Route Description */}
      <div>
        <label
          htmlFor="route_description"
          className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
        >
          Popis trasy
        </label>
        <textarea
          id="route_description"
          name="route_description"
          disabled={isPending}
          rows={3}
          defaultValue={initialData?.route_description || ""}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Krátce popiš, kudy a proč tudy…"
        />
        {errors.route_description && (
          <p className="mt-1 text-sm text-red-600">{errors.route_description}</p>
        )}
      </div>

      {/* Type */}
      <div>
        <label
          htmlFor="type"
          className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
        >
          Typ místa *
        </label>
        <select
          id="type"
          name="type"
          required
          disabled={isPending}
          defaultValue={initialData?.type || "other"}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {PLACE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600">{errors.type}</p>
        )}
      </div>

      {/* Area */}
      <div>
        <label
          htmlFor="area"
          className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
        >
          Oblast / Region *
        </label>
        <input
          type="text"
          id="area"
          name="area"
          required
          disabled={isPending}
          defaultValue={initialData?.area}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="např. Krkonoše, Morava"
        />
        {errors.area && (
          <p className="mt-1 text-sm text-red-600">{errors.area}</p>
        )}
      </div>

      {/* Why */}
      <div>
        <label
          htmlFor="why"
          className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
        >
          Proč sem jít? *
        </label>
        <textarea
          id="why"
          name="why"
          required
          disabled={isPending}
          rows={4}
          defaultValue={initialData?.why}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Popiš, proč se sem vyplatí vyrazit..."
        />
        {errors.why && (
          <p className="mt-1 text-sm text-red-600">{errors.why}</p>
        )}
      </div>

      {/* Time & Difficulty - side by side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Time */}
        <div>
          <label
            htmlFor="time_min"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Čas (minuty) *
          </label>
          <input
            type="number"
            id="time_min"
            name="time_min"
            required
            min="1"
            disabled={isPending}
            defaultValue={initialData?.time_min}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="např. 60"
          />
          {errors.time_min && (
            <p className="mt-1 text-sm text-red-600">{errors.time_min}</p>
          )}
        </div>

        {/* Difficulty */}
        <div>
          <label
            htmlFor="difficulty"
            className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
          >
            Náročnost (1-5) *
          </label>
          <input
            type="number"
            id="difficulty"
            name="difficulty"
            required
            min="1"
            max="5"
            disabled={isPending}
            defaultValue={initialData?.difficulty}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="1-5"
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            1 = pohodička, 5 = budeš si pamatovat nohy
          </p>
          {errors.difficulty && (
            <p className="mt-1 text-sm text-red-600">{errors.difficulty}</p>
          )}
        </div>
      </div>

      {/* Start Coords */}
      <div>
        <label
          htmlFor="start_coords"
          className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
        >
          Start (lat,lng) — odkud vyrážíš *
        </label>
        <input
          type="text"
          id="start_coords"
          name="start_coords"
          required
          disabled={isPending}
          defaultValue={formatCoords(
            initialData?.start_lat,
            initialData?.start_lng
          )}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
          placeholder="49.83412, 18.28234"
        />
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Z Mapy.cz zkopíruj souřadnice. Příklad: 49.83412, 18.28234
        </p>
        {errors.start_coords && (
          <p className="mt-1 text-sm text-red-600">{errors.start_coords}</p>
        )}
      </div>

      {/* End Coords */}
      <div>
        <label
          htmlFor="end_coords"
          className="block text-sm font-medium mb-2 text-[var(--text-primary)]"
        >
          Cíl (lat,lng) — kde je poklad *
        </label>
        <input
          type="text"
          id="end_coords"
          name="end_coords"
          required
          disabled={isPending}
          defaultValue={formatCoords(
            initialData?.end_lat,
            initialData?.end_lng
          )}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
          placeholder="49.83412, 18.28234"
        />
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Z Mapy.cz zkopíruj souřadnice. Příklad: 49.83412, 18.28234
        </p>
        {errors.end_coords && (
          <p className="mt-1 text-sm text-red-600">{errors.end_coords}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          variant="primary"
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Ukládám..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
