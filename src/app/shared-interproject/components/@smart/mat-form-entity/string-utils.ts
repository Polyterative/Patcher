/**
 * String utility functions for mat-form-entity component
 */

const EXTRA_ACCENT_MAP: Record<string, string> = {
  'Ł': 'L',
  'ł': 'l',
  'Ø': 'O',
  'ø': 'o',
};

/**
 * Removes accents/diacritics from a string to enable accent-insensitive search.
 * Useful for searching brands and modules like "Instruō", "Blukač", "Lùbadh", etc.
 * Uses Unicode normalization to strip combining diacritic marks.
 *
 * @param str - The string to normalize
 * @returns The string with accents removed
 *
 * @example
 * removeAccents("Instruō") // returns "Instruo"
 * removeAccents("Blukač") // returns "Blukac"
 * removeAccents("Lùbadh") // returns "Lubadh"
 */
export function removeAccents(str: string): string {
  if (!str || typeof str !== 'string') {
    return str;
  }
  
  return str
    .replace(/[ŁłØø]/g, character => EXTRA_ACCENT_MAP[character] ?? character)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalizes a string for accent-insensitive, case-insensitive comparison.
 * Combines accent removal and lowercase conversion.
 *
 * @param str - The string to normalize
 * @returns The normalized string (lowercase, no accents)
 *
 * @example
 * normalizeForSearch("Instruō") // returns "instruo"
 * normalizeForSearch("Blukač") // returns "blukac"
 */
export function normalizeForSearch(str: string): string {
  if (!str || typeof str !== 'string') {
    return str;
  }
  
  return removeAccents(str).toLowerCase();
}
