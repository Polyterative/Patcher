import type {MinimalModule} from 'src/app/models/module';
import {
  buildPriceDropSummaries,
  formatPriceDropPercent,
  formatPriceDropRange,
  getReliablePriceDrops,
  groupPriceDropSnapshotsByModule,
  PRICE_DROP_WINDOW_DAYS,
  PriceDropHistorySnapshot
} from '../../backend/module-price-drops.utils';
import type {
  ApplicationPriceDropsSection,
  ApplicationPriceDropTopItem
} from './application-statistics.models';

export function mapPriceDropsSection(
  snapshots: ReadonlyArray<PriceDropHistorySnapshot>,
  modulesById: ReadonlyMap<number, MinimalModule>,
  referenceDate: Date = new Date()
): ApplicationPriceDropsSection {
  const grouped = groupPriceDropSnapshotsByModule(snapshots);
  const summaries = buildPriceDropSummaries(grouped, referenceDate);
  const trackedCount = summaries.length;
  const reliableDrops = getReliablePriceDrops(summaries);
  const dropCount = reliableDrops.length;
  const topSummary = reliableDrops[0]?.summary ?? null;

  if (!topSummary) {
    return {
      trackedCount,
      dropCount: 0,
      takeaway: trackedCount > 0
        ? `No reliable price drops in the last ${ PRICE_DROP_WINDOW_DAYS } days across ${ trackedCount } tracked modules — small wiggles and single-blip errors are filtered out.`
        : 'Not enough price history yet — drops appear once enough tracked modules have comparable 60-day history.',
      topDrop: null,
      suppressed: true
    };
  }

  const module = modulesById.get(topSummary.moduleId);
  const topDrop: ApplicationPriceDropTopItem = {
    moduleId: topSummary.moduleId,
    name: module?.name ?? `Module ${ topSummary.moduleId }`,
    manufacturerName: module?.manufacturer?.name ?? 'Unknown maker',
    module,
    trendPercent: topSummary.trendPercent,
    dropLabel: formatPriceDropPercent(topSummary.trendPercent),
    priceRangeLabel: formatPriceDropRange(topSummary),
    storeCount: topSummary.storeCount,
    earliestObservedAt: topSummary.earliestObservedAt,
    latestObservedAt: topSummary.latestObservedAt
  };

  const takeaway = dropCount === 1
    ? `1 tracked module dropped reliably in the last ${ PRICE_DROP_WINDOW_DAYS } days (out of ${ trackedCount } with enough history).`
    : `${ dropCount } tracked modules dropped reliably in the last ${ PRICE_DROP_WINDOW_DAYS } days (out of ${ trackedCount } with enough history).`;

  return {
    trackedCount,
    dropCount,
    takeaway,
    topDrop,
    suppressed: false
  };
}
