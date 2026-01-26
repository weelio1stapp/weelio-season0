import { z } from "zod";
import { parseLatLng } from "@/lib/utils/coords";

const PLACE_TYPES = [
  "urban_walk",
  "nature_walk",
  "viewpoint",
  "park_forest",
  "industrial",
  "lake_river",
  "other",
] as const;

/**
 * Zod schema for Create Place form
 */
export const createPlaceSchema = z.object({
  name: z
    .string()
    .min(1, "Název je povinný")
    .max(200, "Název je příliš dlouhý (max 200 znaků)"),

  type: z.enum(PLACE_TYPES, {
    errorMap: () => ({ message: "Vyber platný typ místa" }),
  }),

  area: z
    .string()
    .min(1, "Oblast je povinná")
    .max(100, "Oblast je příliš dlouhá (max 100 znaků)"),

  why: z
    .string()
    .min(1, "Popis je povinný")
    .max(500, "Popis je příliš dlouhý (max 500 znaků)"),

  time_min: z.coerce
    .number({ invalid_type_error: "Zadej číslo" })
    .int("Musí být celé číslo")
    .min(1, "Minimálně 1 minuta")
    .max(1440, "Maximum 1440 minut (24 hodin)"),

  difficulty: z.coerce
    .number({ invalid_type_error: "Zadej číslo" })
    .int("Musí být celé číslo")
    .min(1, "Minimálně 1")
    .max(5, "Maximálně 5"),

  start_coords: z
    .string()
    .min(1, "Start souřadnice jsou povinné")
    .refine(
      (val) => parseLatLng(val) !== null,
      "Neplatný formát. Použij: lat,lng (např. 49.83412, 18.28234)"
    ),

  end_coords: z
    .string()
    .min(1, "Cíl souřadnice jsou povinné")
    .refine(
      (val) => parseLatLng(val) !== null,
      "Neplatný formát. Použij: lat,lng (např. 49.83412, 18.28234)"
    ),
});

export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;
