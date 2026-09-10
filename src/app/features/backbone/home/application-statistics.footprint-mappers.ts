import { PublicApplicationStatistics } from '../../backend/supabase-queries';
import {
  ApplicationPrivateFootprint,
  ApplicationPrivateFootprintSlice,
  ApplicationPrivateFootprintSliceKey
} from './application-statistics.models';
import { ApplicationStatisticsMapperContext } from './application-statistics.mapper-context';
import { formatPercentValue } from './application-statistics.utils';

// Privacy suppression gate: exact private splits stay hidden until the universe
// is large enough that no slice singles anyone out. Mirrors the existing
// createRateDatum minimums convention (sharing-mappers use 3/10).
export const PRIVATE_FOOTPRINT_MIN_TOTAL = 10;
export const PRIVATE_FOOTPRINT_MIN_SLICE = 3;

// Racks-takeaway thresholds: a single symmetric majority line at 60% keeps the
// three branches hysteresis-free. Shares use exact counts (not rounded labels),
// and the 60% boundary is inclusive to the majority side: public >= 60% reads as
// a public majority, public <= 40% (private >= 60%) reads as a private majority,
// and anything strictly between reads as near-parity.
export const PRIVATE_FOOTPRINT_MAJORITY_SHARE = 0.6;
export const PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_SUPPRESSED =
  'The public-private rack split is not reported yet.';
export const PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PUBLIC_MAJORITY =
  'Most racks are shared publicly, with the remaining private share included in the totals.';
export const PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PRIVATE_MAJORITY =
  'Most racks stay private, with the remaining public share included in the totals.';
export const PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PARITY =
  'Racks are split between public and private with no clear majority, both included in the totals.';

export function mapRacksTakeaway(
  suppressed: boolean,
  racks: ApplicationPrivateFootprintSlice | undefined
): string {
  if (suppressed || !racks) {
    return PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_SUPPRESSED;
  }

  const publicShare = racks.publicCount / Math.max(racks.totalCount, 1);
  if (publicShare >= PRIVATE_FOOTPRINT_MAJORITY_SHARE) {
    return PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PUBLIC_MAJORITY;
  }
  if (publicShare <= 1 - PRIVATE_FOOTPRINT_MAJORITY_SHARE) {
    return PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PRIVATE_MAJORITY;
  }
  return PRIVATE_FOOTPRINT_RACKS_TAKEAWAY_PARITY;
}

function mapSlice(
  key: ApplicationPrivateFootprintSliceKey,
  label: string,
  publicCount: number | undefined,
  privateCount: number | undefined,
  totalCount: number | undefined,
  context: ApplicationStatisticsMapperContext
): ApplicationPrivateFootprintSlice | null {
  if (publicCount === undefined || privateCount === undefined || totalCount === undefined) {
    return null;
  }

  if (
    totalCount < PRIVATE_FOOTPRINT_MIN_TOTAL
    || publicCount < PRIVATE_FOOTPRINT_MIN_SLICE
    || privateCount < PRIVATE_FOOTPRINT_MIN_SLICE
  ) {
    return null;
  }

  return {
    key,
    label,
    publicCount,
    privateCount,
    totalCount,
    publicSharePercent: Math.round((publicCount / Math.max(totalCount, 1)) * 100),
    privateSharePercent: Math.round((privateCount / Math.max(totalCount, 1)) * 100),
    publicRowLabel: `${ context.formatCount(publicCount) } (${ formatPercentValue(publicCount, totalCount) })`,
    privateRowLabel: `${ context.formatCount(privateCount) } (${ formatPercentValue(privateCount, totalCount) })`
  };
}

export function mapPrivateFootprint(
  statistics: PublicApplicationStatistics,
  context: ApplicationStatisticsMapperContext
): ApplicationPrivateFootprint {
  const slices = [
    mapSlice('racks', 'Racks', statistics.publicRacks, statistics.privateRacks, statistics.totalRacks, context),
    mapSlice('modules', 'Modules', statistics.publicModules, statistics.privateModules, statistics.totalModules, context),
    mapSlice('patches', 'Patches', statistics.publicPatches, statistics.privatePatches, statistics.totalPatches, context)
  ].filter((slice): slice is ApplicationPrivateFootprintSlice => slice !== null);

  const suppressed = slices.find((slice) => slice.key === 'racks') === undefined;

  return {
    // The racks slice carries the card: without it the donut has no subject.
    suppressed,
    slices,
    racksTakeaway: mapRacksTakeaway(suppressed, slices.find((slice) => slice.key === 'racks'))
  };
}
