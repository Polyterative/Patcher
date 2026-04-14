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

function tokenizeSearchValue(str: string): string[] {
  const normalized = normalizeForSearch(str)?.trim() ?? '';
  return normalized.length > 0 ? normalized.split(/\s+/).filter(Boolean) : [];
}

function isSingleEditMatch(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }

  if (Math.abs(left.length - right.length) !== 1) {
    return false;
  }

  if (left.length < 5 || right.length < 5) {
    return false;
  }

  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex++;
      rightIndex++;
      continue;
    }

    edits++;
    if (edits > 1) {
      return false;
    }

    if (left.length > right.length) {
      leftIndex++;
      continue;
    }

    if (right.length > left.length) {
      rightIndex++;
      continue;
    }

  }

  if (leftIndex < left.length || rightIndex < right.length) {
    edits++;
  }

  return edits <= 1;
}

/**
 * Matches a search query against one or more candidate values.
 * Uses normalized substring search first, then allows a single missing or extra
 * character on long tokens so close queries like "Belgrade" still match "Belgrad"
 * without broad substitution-heavy matches.
 */
export function matchesSearchQuery(
  query: string,
  ...candidateValues: Array<string | null | undefined>
): boolean {
  const normalizedQuery = normalizeForSearch(query)?.trim() ?? '';
  if (!normalizedQuery) {
    return true;
  }

  const normalizedCandidates = candidateValues
    .map(value => normalizeForSearch(`${ value ?? '' }`)?.trim() ?? '')
    .filter(Boolean);

  if (normalizedCandidates.length === 0) {
    return false;
  }

  const combinedCandidates = normalizedCandidates.join(' ');
  if (combinedCandidates.includes(normalizedQuery)) {
    return true;
  }

  const candidateTerms = normalizedCandidates.flatMap(tokenizeSearchValue);
  const queryTerms = tokenizeSearchValue(normalizedQuery);

  return queryTerms.every(queryTerm => {
    if (combinedCandidates.includes(queryTerm)) {
      return true;
    }

    return candidateTerms.some(candidateTerm => isSingleEditMatch(queryTerm, candidateTerm));
  });
}
