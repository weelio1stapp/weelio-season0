/**
 * Parses lat,lng coordinates from user input with robust normalization
 *
 * Supports:
 * - "49.83412, 18.28234"
 * - "49,83412  , 18,28234" (decimal commas)
 * - "49,83412,18,28234" (decimal commas, no spaces)
 *
 * @param input - User input string (lat,lng)
 * @returns { lat: number, lng: number } or null if parsing fails
 */
export function parseLatLng(input: string): { lat: number; lng: number } | null {
  if (!input || typeof input !== "string") return null;

  // Remove all whitespace first
  let normalized = input.trim().replace(/\s+/g, "");

  // Count commas to determine strategy
  const commaCount = (normalized.match(/,/g) || []).length;

  if (commaCount === 0) {
    // No commas at all - invalid
    return null;
  }

let lat = Number.NaN;
let lng = Number.NaN;
let found = false;

  if (commaCount === 1) {
    // Simple case: one comma separating lat and lng
    // Both parts may use dots as decimal separators
    const parts = normalized.split(",");
    lat = parseFloat(parts[0]);
    lng = parseFloat(parts[1]);
  } else if (commaCount >= 2) {
    // Multiple commas: some are decimal separators, one is the lat/lng separator
    // Heuristic: find the "middle" comma that splits into two valid parts

    // Try to find the separator comma by looking for the split that produces
    // two parts with at least one comma each (decimal commas)
    let found = false;

    // Strategy: assume the separator is between two numbers
    // Replace decimal commas with dots, then find the lat/lng separator

    // First, try to identify if there are exactly 2 decimal numbers with commas
    // Pattern: "XX,XX,YY,YY" means first comma group is lat, second is lng

    // Simple heuristic: split by commas and try to group them
    const parts = normalized.split(",");

    if (parts.length === 3) {
      // Could be: "49,83412,18" or "49,834,18.28234"
      // Try first interpretation: decimal comma in first number
      const latStr1 = parts[0] + "." + parts[1];
      const lngStr1 = parts[2];
      const lat1 = parseFloat(latStr1);
      const lng1 = parseFloat(lngStr1);

      if (!isNaN(lat1) && !isNaN(lng1) && isValidLat(lat1) && isValidLng(lng1)) {
        lat = lat1;
        lng = lng1;
        found = true;
      }

      if (!found) {
        // Try second interpretation: decimal comma in second number
        const latStr2 = parts[0];
        const lngStr2 = parts[1] + "." + parts[2];
        const lat2 = parseFloat(latStr2);
        const lng2 = parseFloat(lngStr2);

        if (!isNaN(lat2) && !isNaN(lng2) && isValidLat(lat2) && isValidLng(lng2)) {
          lat = lat2;
          lng = lng2;
          found = true;
        }
      }
    } else if (parts.length === 4) {
      // "49,83412,18,28234" - both have decimal commas
      const latStr = parts[0] + "." + parts[1];
      const lngStr = parts[2] + "." + parts[3];
      lat = parseFloat(latStr);
      lng = parseFloat(lngStr);
      found = true;
    }

    if (!found) {
      return null;
    }
  } else {
    return null;
  }

  // Validate ranges
  if (isNaN(lat) || isNaN(lng)) return null;
  if (!isValidLat(lat) || !isValidLng(lng)) return null;

  return { lat, lng };
}

function isValidLat(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

function isValidLng(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

/**
 * Format error message for coordinate parsing failure
 */
export function getCoordErrorMessage(input: string): string {
  if (!input) return "Souřadnice jsou povinné";

  const parsed = parseLatLng(input);
  if (!parsed) {
    return "Neplatný formát. Použij: lat,lng (např. 49.83412, 18.28234)";
  }

  return "";
}
