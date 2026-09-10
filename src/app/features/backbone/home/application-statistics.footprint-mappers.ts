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

  return {
    // The racks slice carries the card: without it the donut has no subject.
    suppressed: slices.find((slice) => slice.key === 'racks') === undefined,
    slices
  };
}
