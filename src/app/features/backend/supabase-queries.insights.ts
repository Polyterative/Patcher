/**
 * Insights and aggregation utilities for SupabaseQueriesService
 */
import {
  PublicApplicationModuleInsightBucket
} from './supabase-queries.models';
import { ManufacturerInsightStats } from './supabase-queries.types';

/**
 * Rank buckets by count and return top N
 */
export function rankBuckets(
  counts: Map<string, number>,
  limit: number,
  detailBuilder?: (count: number) => string
): PublicApplicationModuleInsightBucket[] {
  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit)
    .map(([label, count]) => ({
      label,
      count,
      ...(detailBuilder ? {detail: detailBuilder(count)} : {})
    }));
}

/**
 * Rank buckets in a specific order
 */
export function rankOrderedBuckets(
  counts: Map<string, number>,
  orderedLabels: string[],
  detailBuilder?: (count: number) => string
): PublicApplicationModuleInsightBucket[] {
  return orderedLabels
    .filter((label) => (counts.get(label) ?? 0) > 0)
    .map((label) => ({
      label,
      count: counts.get(label) ?? 0,
      ...(detailBuilder ? {detail: detailBuilder(counts.get(label) ?? 0)} : {})
    }));
}

/**
 * Rank number buckets by count and return top N
 */
export function rankNumberBuckets(
  counts: Map<number, number>,
  limit: number,
  detailBuilder?: (count: number) => string
): PublicApplicationModuleInsightBucket[] {
  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0] - b[0];
    })
    .slice(0, limit)
    .map(([value, count]) => ({
      label: `${ value } HP`,
      count,
      ...(detailBuilder ? {detail: detailBuilder(count)} : {})
    }));
}

/**
 * Rank manufacturers by a custom score function
 */
export function rankManufacturerScores(
  statsByManufacturer: Map<string, ManufacturerInsightStats>,
  scorer: (stats: ManufacturerInsightStats) => number | null,
  detailBuilder: (stats: ManufacturerInsightStats, score: number) => string,
  limit = 5
): PublicApplicationModuleInsightBucket[] {
  return [...statsByManufacturer.entries()]
    .map(([label, stats]) => ({
      label,
      score: scorer(stats),
      stats
    }))
    .filter((entry): entry is {label: string; score: number; stats: ManufacturerInsightStats} =>
      entry.score !== null
    )
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.label.localeCompare(b.label);
    })
    .slice(0, limit)
    .map(({label, score, stats}) => ({
      label,
      count: score,
      detail: detailBuilder(stats, score)
    }));
}
