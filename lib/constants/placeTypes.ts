/**
 * Single source of truth for Place Types
 * Centralized constants, types, and labels for place categorization
 */

/**
 * All valid place type values
 */
export const PLACE_TYPES = [
  "urban_walk",
  "nature_walk",
  "viewpoint",
  "park_forest",
  "industrial",
  "lake_river",
  "other",
] as const;

/**
 * PlaceType TypeScript type derived from PLACE_TYPES
 */
export type PlaceType = (typeof PLACE_TYPES)[number];

/**
 * User-facing labels for place types with emoji
 */
export const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  urban_walk: "🏙 Městská procházka",
  nature_walk: "🌲 Přírodní túra",
  viewpoint: "🏔 Vyhlídka",
  park_forest: "🌳 Park / Les",
  industrial: "🏭 Industriál",
  lake_river: "💧 Jezero / Řeka",
  other: "📍 Jiné",
};

/**
 * Type guard to check if a string is a valid PlaceType
 */
export function isPlaceType(value: string): value is PlaceType {
  return PLACE_TYPES.includes(value as PlaceType);
}
