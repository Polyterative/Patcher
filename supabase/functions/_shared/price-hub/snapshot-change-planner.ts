/**
 * Change-only snapshot write planner ("floating endpoint" segments).
 *
 * A stable price segment is stored as at most two physical rows:
 * an immutable start row plus an endpoint row whose observed_at is
 * bumped in place on every unchanged crawl. See
 * internaldocs/workflow/plans/price-hub-snapshot-compaction.md.
 *
 * Pure module: shared by the local importer (Node) and the edge worker (Deno).
 */

export interface SnapshotObservation {
  listingId: number;
  priceAmountMinor: number | null;
  currency: string | null;
  availability: string;
}

export interface LatestSnapshotRow {
  id: number;
  listing_id: number;
  observed_at: string;
  price_amount_minor: number | null;
  currency: string | null;
  availability: string;
}

export type SnapshotWriteDecision =
  | { kind: 'insert_start'; listingId: number }
  | { kind: 'insert_endpoint'; listingId: number }
  | { kind: 'update_endpoint'; listingId: number; snapshotId: number };

export interface SnapshotWritePlan {
  decisions: SnapshotWriteDecision[];
  /** Observations dropped because an earlier observation in the batch used the same listing id. */
  duplicateListingIds: number[];
}

/**
 * Decide, per listing, how an observation is persisted:
 * - no previous rows, or values changed → insert a new segment start;
 * - values unchanged but the latest row is a lone start → insert the endpoint row;
 * - values unchanged and the two latest rows both match → bump the latest row (the endpoint) in place.
 *
 * `existingRows` only needs the latest two rows per listing (any order); extra rows are tolerated.
 */
export function planSnapshotWrites(
  observations: readonly SnapshotObservation[],
  existingRows: readonly LatestSnapshotRow[],
): SnapshotWritePlan {
  const rowsByListing = groupRowsByListing(existingRows);
  const seenListingIds = new Set<number>();
  const decisions: SnapshotWriteDecision[] = [];
  const duplicateListingIds: number[] = [];

  for (const observation of observations) {
    if (seenListingIds.has(observation.listingId)) {
      duplicateListingIds.push(observation.listingId);
      continue;
    }
    seenListingIds.add(observation.listingId);
    decisions.push(planListingWrite(observation, rowsByListing.get(observation.listingId) ?? []));
  }

  return { decisions, duplicateListingIds };
}

export function readEndpointUpdateSnapshotIds(plan: SnapshotWritePlan): number[] {
  return plan.decisions
    .filter((decision): decision is Extract<SnapshotWriteDecision, { kind: 'update_endpoint' }> => decision.kind === 'update_endpoint')
    .map((decision) => decision.snapshotId);
}

export function readInsertListingIds(plan: SnapshotWritePlan): number[] {
  return plan.decisions
    .filter((decision) => decision.kind !== 'update_endpoint')
    .map((decision) => decision.listingId);
}

function planListingWrite(
  observation: SnapshotObservation,
  listingRows: readonly LatestSnapshotRow[],
): SnapshotWriteDecision {
  const sortedRows = [...listingRows].sort(compareSnapshotRowsDesc);
  const latest = sortedRows[0];
  const previous = sortedRows[1];

  if (!latest || !observationMatchesRow(observation, latest)) {
    return { kind: 'insert_start', listingId: observation.listingId };
  }
  if (previous && observationMatchesRow(observation, previous)) {
    return { kind: 'update_endpoint', listingId: observation.listingId, snapshotId: latest.id };
  }
  return { kind: 'insert_endpoint', listingId: observation.listingId };
}

function observationMatchesRow(observation: SnapshotObservation, row: LatestSnapshotRow): boolean {
  return observation.priceAmountMinor === row.price_amount_minor
    && observation.currency === row.currency
    && observation.availability === row.availability;
}

function compareSnapshotRowsDesc(left: LatestSnapshotRow, right: LatestSnapshotRow): number {
  const leftTime = Date.parse(left.observed_at);
  const rightTime = Date.parse(right.observed_at);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }
  return right.id - left.id;
}

function groupRowsByListing(rows: readonly LatestSnapshotRow[]): Map<number, LatestSnapshotRow[]> {
  const rowsByListing = new Map<number, LatestSnapshotRow[]>();
  for (const row of rows) {
    const listingRows = rowsByListing.get(row.listing_id) ?? [];
    listingRows.push(row);
    rowsByListing.set(row.listing_id, listingRows);
  }
  return rowsByListing;
}
