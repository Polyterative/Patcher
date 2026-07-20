import { HiddenUsageBucket } from 'src/app/components/module-parts/module-detail-data.service';
import { ModulePossessionCounts } from 'src/app/components/module-parts/module-detail-data.models';
import { formatMarketplaceMinorUnits } from 'src/app/features/marketplace/marketplace-money.utils';
import { UserModulePossessionKind } from 'src/app/models/module';
import {
  UserModuleAcquisition,
  UserModuleAcquisitionSource
} from 'src/app/models/user-module-acquisition';

export interface ModuleCommunityStat {
  label: string;
  value: string;
  icon: string;
  size: string;
}

export function hasHiddenUsage(bucket: HiddenUsageBucket | null | undefined): boolean {
  return !!bucket && bucket !== 'none';
}

export function getHiddenUsageSupplementCopy(kind: 'rack' | 'patch', bucket: HiddenUsageBucket | null | undefined): string {
  return `Plus ${ getHiddenUsageDescriptor(bucket) } private or otherwise hidden ${ getHiddenUsageNoun(kind) }.`;
}

export function getNoPublicUsageCopy(kind: 'rack' | 'patch', bucket: HiddenUsageBucket | null | undefined): string {
  if (!hasHiddenUsage(bucket)) {
    return `No ${ getHiddenUsageNoun(kind) } using this module yet. Try adding it to yours!`;
  }

  return `No public ${ getHiddenUsageNoun(kind) } using this module yet. It still appears in ${ getHiddenUsageDescriptor(bucket) } private or otherwise hidden ${ getHiddenUsageNoun(kind) }.`;
}

export function getUsagePendingCopy(kind: 'rack' | 'patch'): string {
  return `Checking private and hidden ${ kind } usage...`;
}

export function getModuleDetailTitleSub(
  moduleName: string | null | undefined,
  possessionKind: UserModulePossessionKind | null | undefined
): string | undefined {
  if (!moduleName) {
    return 'Loading...';
  }

  const possessionLabel = getPossessionLabel(possessionKind);
  return possessionLabel ? `${ moduleName } (${ possessionLabel })` : moduleName;
}

export function getCommunityData(counts: ModulePossessionCounts | undefined, coolCount: number | undefined): ModuleCommunityStat[] | undefined {
  if (!counts || coolCount === undefined) return undefined;

  const stats: ModuleCommunityStat[] = [
    { label: 'Cool', value: coolCount.toString(), icon: 'auto_awesome', size: 'auto' },
    { label: 'Owners', value: counts.hasCount.toString(), icon: 'inventory_2', size: 'auto' },
    { label: 'Wishlist', value: counts.wantsCount.toString(), icon: 'star_outline', size: 'auto' },
    { label: 'For Sale', value: counts.sellsCount.toString(), icon: 'sell', size: 'auto' }
  ].filter(stat => Number(stat.value) > 0);

  return stats.length > 0 ? stats : undefined;
}

export function formatAcquisitionValue(acquisition: UserModuleAcquisition): string {
  if (acquisition.price_amount_minor === null || !acquisition.currency) {
    return 'No price recorded';
  }
  return formatMarketplaceMinorUnits(acquisition.price_amount_minor, acquisition.currency);
}

export function getAcquisitionSourceLabel(source: UserModuleAcquisitionSource): string {
  return source === 'unknown'
    ? 'source unknown'
    : source.replace('_', ' ');
}

function getHiddenUsageDescriptor(bucket: HiddenUsageBucket | null | undefined): string {
  switch (bucket) {
    case 'some':
      return 'some';
    case '5_plus':
      return '5+';
    case '10_plus':
      return '10+';
    case '25_plus':
      return '25+';
    default:
      return 'no';
  }
}

function getHiddenUsageNoun(kind: 'rack' | 'patch'): 'racks' | 'patches' {
  return kind === 'rack' ? 'racks' : 'patches';
}

function getPossessionLabel(kind: UserModulePossessionKind | null | undefined): string | null {
  switch (kind) {
    case 'HAS':
      return 'Owned';
    case 'WANTS':
      return 'Wanted';
    case 'SELLS':
      return 'For sale';
    default:
      return null;
  }
}
