"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { PlacesFilters } from "@/lib/placesFilters";
import type { PlaceType } from "@/lib/db/places";

import {
  PLACE_TYPE_LABELS,
  DIFFICULTY_LABELS,
  TIME_LABELS,
  SORT_LABELS,
  buildFilterUrl,
  DifficultyPreset,
  TimePreset,
  SortOption,
} from "@/lib/placesFilters";
import type { PlaceType } from "@/lib/db/places";

type Props = {
  currentFilters: PlacesFilters;
  availableAreas: string[];
  currentUserId: string | null;
};

export default function PlacesFilters({
  currentFilters,
  availableAreas,
  currentUserId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Toggle a value in an array filter
  function toggleArrayFilter<T extends string>(
    key: keyof PlacesFilters,
    value: T
  ) {
    const current = currentFilters[key] as T[];
    const newValues = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    updateFilters({ [key]: newValues });
  }

  // Update filters and navigate
  function updateFilters(updates: Partial<PlacesFilters>) {
    const newFilters = { ...currentFilters, ...updates };
    const url = `/places${buildFilterUrl(newFilters)}`;
    router.push(url);
  }

  // Reset all filters
  function resetFilters() {
    router.push("/places");
  }

  const allPlaceTypes: PlaceType[] = [
    "urban_walk",
    "nature_walk",
    "viewpoint",
    "park_forest",
    "industrial",
    "lake_river",
    "other",
  ];

  const allDifficulties: DifficultyPreset[] = ["easy", "medium", "hard"];
  const allTimes: TimePreset[] = ["lt60", "btw60_120", "gt120"];
  const allSorts: SortOption[] = ["newest", "shortest", "easiest", "hardest"];

  return (
    <div className="rounded-2xl border p-6 space-y-6">
      {/* My Places toggle */}
      {currentUserId && (
        <div className="pb-4 border-b border-gray-200">
          <button
            onClick={() => updateFilters({ myPlaces: !currentFilters.myPlaces })}
            className={`px-4 py-2 text-sm border-2 rounded-lg transition-colors ${
              currentFilters.myPlaces
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {currentFilters.myPlaces ? "✓ Moje místa" : "Moje místa"}
          </button>
        </div>
      )}

      {/* Type chips */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Typ místa</h3>
        <div className="flex flex-wrap gap-2">
          {allPlaceTypes.map((type) => (
            <button
              key={type}
              onClick={() => toggleArrayFilter("types", type)}
              className={`rounded-full border-2 px-3 py-1.5 text-sm transition-colors ${
                currentFilters.types.includes(type)
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {PLACE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty presets */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Náročnost</h3>
        <div className="flex flex-wrap gap-2">
          {allDifficulties.map((diff) => (
            <button
              key={diff}
              onClick={() => toggleArrayFilter("difficulty", diff)}
              className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                currentFilters.difficulty.includes(diff)
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {DIFFICULTY_LABELS[diff]}
            </button>
          ))}
        </div>
      </div>

      {/* Time presets */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Délka trasy</h3>
        <div className="flex flex-wrap gap-2">
          {allTimes.map((time) => (
            <button
              key={time}
              onClick={() => toggleArrayFilter("time", time)}
              className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                currentFilters.time.includes(time)
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {TIME_LABELS[time]}
            </button>
          ))}
        </div>
      </div>

      {/* Area dropdown and Sort */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Area */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Oblast</h3>
          <select
            value={currentFilters.area ?? ""}
            onChange={(e) =>
              updateFilters({ area: e.target.value || null })
            }
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
          >
            <option value="">Vše</option>
            {availableAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Řazení</h3>
          <select
            value={currentFilters.sort}
            onChange={(e) =>
              updateFilters({ sort: e.target.value as SortOption })
            }
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
          >
            {allSorts.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reset button */}
      <div className="pt-2">
        <button
          onClick={resetFilters}
          className="w-full md:w-auto px-6 py-2 text-sm border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          Resetovat filtry
        </button>
      </div>
    </div>
  );
}
