/**
 * Pure helper functions for SupabaseQueriesService
 */

/**
 * Apply client-side search filter to a response with pagination
 */
type ResponseRow<Response> = Response extends { data?: (infer Row)[] } ? Row : never;

export function applyClientSideSearchFilter<
  Response extends { data?: unknown[]; count?: number | null } & Record<string, unknown>
>(
  response: Response,
  from: number,
  to: number,
  predicate: (row: ResponseRow<Response>) => boolean
): Omit<Response, 'data' | 'count'> & { data: ResponseRow<Response>[]; count: number } {
  const rows = Array.isArray(response?.data) ? response.data as ResponseRow<Response>[] : [];
  const filteredRows = rows.filter(predicate);

  return {
    ...response,
    data: filteredRows.slice(from, to + 1),
    count: filteredRows.length
  };
}

/**
 * Escape special characters in ILIKE pattern for PostgreSQL
 */
export function escapeIlikePattern(value: string): string {
  return value.replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_');
}

/**
 * Get HP band label for a given HP value
 */
export function getHpBandLabel(hp: number): string {
  if (hp <= 2) { return '0-2 HP'; }
  if (hp <= 5) { return '3-5 HP'; }
  if (hp <= 8) { return '6-8 HP'; }
  if (hp <= 16) { return '9-16 HP'; }
  if (hp <= 28) { return '17-28 HP'; }
  return '29+ HP';
}

/**
 * Check if a standard name indicates a 1U standard
 */
export function isOneUStandard(standardName: string): boolean {
  return standardName.toLowerCase().includes('1u');
}

/**
 * HP band order for sorting
 */
export const HP_BAND_ORDER = ['0-2 HP', '3-5 HP', '6-8 HP', '9-16 HP', '17-28 HP', '29+ HP'];
