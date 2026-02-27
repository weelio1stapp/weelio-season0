import { PlaceType, isPlaceType, PLACE_TYPE_LABELS } from "./constants/placeTypes";

// Re-export for backward compatibility
export { PLACE_TYPE_LABELS };

export type DifficultyPreset = "easy" | "medium" | "hard";
export type TimePreset = "lt60" | "btw60_120" | "gt120";
export type SortOption = "newest" | "shortest" | "easiest" | "hardest";
export type AudioStatus = "ready" | "draft" | "missing" | null;

export type PlacesFilters = {
  types: PlaceType[];
  difficulty: DifficultyPreset[];
  time: TimePreset[];
  area: string | null;
  sort: SortOption;
  myPlaces: boolean;
  audioStatus: AudioStatus;
  sport?: "run" | "run_inline" | null;
};

/**
 * Parse URL searchParams into typed filter object
 */
export function parseSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): PlacesFilters {
  // Parse types
  const typesParam = searchParams.types;
  const types: PlaceType[] = typesParam
    ? String(typesParam)
        .split(",")
        .filter((t) => isPlaceType(t))
    : [];

// Parse difficulty
const diffParam = searchParams.diff;

const difficulty: DifficultyPreset[] = diffParam
  ? String(diffParam)
      .split(",")
      .filter((d): d is DifficultyPreset =>
        (["easy", "medium", "hard"] as const).includes(d as DifficultyPreset)
      )
  : [];

// Parse time
const timeParam = searchParams.time;

const time: TimePreset[] = timeParam
  ? String(timeParam)
      .split(",")
      .filter((t): t is TimePreset =>
        (["lt60", "btw60_120", "gt120"] as const).includes(t as TimePreset)
      )
  : [];

  // Parse area
  const area = searchParams.area ? String(searchParams.area) : null;

  // Parse sort
  const sortParam = searchParams.sort;
  const sort: SortOption =
    sortParam && ["newest", "shortest", "easiest", "hardest"].includes(String(sortParam))
      ? (String(sortParam) as SortOption)
      : "newest";

  // Parse myPlaces
  const myPlaces = searchParams.mine === "1" || searchParams.mine === "true";

  // Parse audioStatus
  const audioParam = searchParams.audio ? String(searchParams.audio) : null;
  const audioStatus: AudioStatus =
    audioParam && ["ready", "draft", "missing"].includes(audioParam)
      ? (audioParam as "ready" | "draft" | "missing")
      : null;

  // Parse sport
  const sportParam = searchParams.sport;
  const sport =
    sportParam === "run" || sportParam === "run_inline"
      ? sportParam
      : null;

  return { types, difficulty, time, area, sort, myPlaces, audioStatus, sport };
}

/**
 * Build URL query string from filters
 */
export function buildFilterUrl(filters: Partial<PlacesFilters>): string {
  const params = new URLSearchParams();

  if (filters.types && filters.types.length > 0) {
    params.set("types", filters.types.join(","));
  }

  if (filters.difficulty && filters.difficulty.length > 0) {
    params.set("diff", filters.difficulty.join(","));
  }

  if (filters.time && filters.time.length > 0) {
    params.set("time", filters.time.join(","));
  }

  if (filters.area) {
    params.set("area", filters.area);
  }

  if (filters.sort && filters.sort !== "newest") {
    params.set("sort", filters.sort);
  }

  if (filters.myPlaces) {
    params.set("mine", "1");
  }

  if (filters.audioStatus) {
    params.set("audio", filters.audioStatus);
  }

  if (filters.sport) {
    params.set("sport", filters.sport);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Difficulty preset labels
 */
export const DIFFICULTY_LABELS: Record<DifficultyPreset, string> = {
  easy: "Pohodička (1-2)",
  medium: "Střední (3)",
  hard: "Náročná (4-5)",
};

/**
 * Time preset labels
 */
export const TIME_LABELS: Record<TimePreset, string> = {
  lt60: "Do hodiny",
  btw60_120: "1-2 hodiny",
  gt120: "Nad 2 hodiny",
};

/**
 * Sort option labels
 */
export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Nejnovější",
  shortest: "Nejkratší",
  easiest: "Nejlehčí",
  hardest: "Nejtěžší",
};

/**
 * Audio status labels
 */
export const AUDIO_STATUS_LABELS: Record<
  "ready" | "draft" | "missing",
  string
> = {
  ready: "🎧 Připravené audio",
  draft: "📝 Rozpracované audio",
  missing: "❌ Bez audia",
};
