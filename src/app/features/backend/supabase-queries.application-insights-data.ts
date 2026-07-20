import {
  forkJoin,
  from as rxFrom,
  Observable,
  of,
  throwError
} from 'rxjs';
import {
  filter,
  map,
  switchMap
} from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/backend/database.types';
import { DbComment } from '../../models/comment';
import { Patch } from '../../models/patch';
import { Rack } from '../../models/rack';
import { PatchModuleInstance } from '../../models/connection';
import {
  DbPaths,
  QueryJoins
} from './DatabaseStrings';
import { Cacheable } from 'ts-cacheable';
import {
  cacheBuster$,
  defaultCacheTime,
  longCacheTime,
  priceHubCacheTime,
  remapErrors,
  smallCacheTime
} from './supabase.cache';
import {
  CurrentUserModulesOrderConfig,
  CurrentUserModulesOrderDirection,
  CurrentUserModulesOrderKey,
  SimpleUserModel
} from './supabase.types';
import {
  matchesSearchQuery
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';
import {
  CurrentUserContributorStats,
  PublicApplicationActivityPoint,
  PublicApplicationInsightsSnapshot,
  PublicApplicationModuleInsightBucket,
  PublicApplicationModuleInsights,
  PublicApplicationStatistics,
  ModulePriceHistorySnapshot,
  ModulePriceListing,
  ModulePriceLatestSnapshot,
  ModuleRecentMarketPrice,
  ModuleSparsePriceHistorySummary,
  PublicModuleDiscoveryEntry,
  PublicModuleDiscoverySnapshot,
  PublicUserContributorStats
} from './supabase-queries.models';
import {
  getModuleRecentMarketPrice,
  ModuleRecentMarketPriceListing
} from './module-price-summary.utils';

export type {
  CurrentUserContributorStats,
  PublicApplicationActivityPoint,
  PublicApplicationInsightsSnapshot,
  PublicApplicationModuleInsightBucket,
  PublicApplicationModuleInsights,
  PublicApplicationStatistics,
  ModulePriceHistorySnapshot,
  ModulePriceListing,
  ModulePriceLatestSnapshot,
  ModuleRecentMarketPrice,
  ModuleSparsePriceHistorySummary,
  PublicModuleDiscoveryEntry,
  PublicModuleDiscoverySnapshot,
  PublicUserContributorStats
} from './supabase-queries.models';

export interface ModuleCommentContextRow {
  id: number;
  name: string;
  manufacturer: {
    name: string;
  };
}

export interface PatchCommentContextRow {
  id: number;
  name: string;
  public_id: string | null;
}

export interface RackCommentContextRow {
  id: number;
  name: string;
  public_id: string | null;
}

import {
  ManufacturerModuleStats,
  ModuleActivityRow,
  ModulePriceHistoryListingRow,
  ModulePriceHistorySnapshotRow,
  ModuleRecentMarketPriceListingRow,
  ModulePriceSnapshotRow,
  ModuleStoreListingRow,
  PublicModuleInsightRow,
  ManufacturerInsightStats
} from './supabase-queries.types';
import {
  ModuleCollectionDetail,
  ModuleCollectionPage,
  ModuleCollectionSummary
} from 'src/app/models/module-collection';
import { MinimalModule } from 'src/app/models/module';
import { UserModuleAcquisition } from 'src/app/models/user-module-acquisition';
import { Tag } from 'src/app/models/tag';
import {
  applyClientSideSearchFilter,
  escapeIlikePattern,
  getHpBandLabel,
  isOneUStandard,
  HP_BAND_ORDER
} from './supabase-queries.helpers';
import {
  rankBuckets,
  rankOrderedBuckets,
  rankNumberBuckets,
  rankManufacturerScores
} from './supabase-queries.insights';
import {
  buildManufacturerActivityRank,
  parseModuleUpdatedTimestampMs,
  buildManufacturerModuleStats,
  withManufacturerModuleStats,
  compareManufacturersByLatestModuleActivity
} from './supabase-queries.manufacturer-stats';
import {
  REACTION_COUNT_COLUMNS,
  REACTION_KIND_COOL,
  REACTION_ROW_COLUMNS,
  type ReactionCountRow,
  type ReactionKind,
  type ReactionRow
} from './supabase-reactions';
import {
  EMPTY_CONTRIBUTOR_STATS,
  MAX_QUERY_ROWS,
  PUBLIC_AUTHOR_GATE_ALIAS,
  SupabaseQueriesBase
} from './supabase-queries.base';


export class SupabaseApplicationInsightsQueries extends SupabaseQueriesBase {


  private async fetchAllPublicModuleInsightRows(): Promise<{
    data: PublicModuleInsightRow[];
    error: any;
  }> {
    const pageSize = MAX_QUERY_ROWS;
    const rows: PublicModuleInsightRow[] = [];
    let offset = 0;

    while (true) {
      const response = await this.supabase
        .from(DbPaths.modules)
        .select('id,hp,created,updated,manufacturer:manufacturerId(id,name),standardMeta:standards!modules_standard_fkey(id,name)')
        .filter('public', 'eq', true)
        .order('id', {ascending: true})
        .range(offset, offset + pageSize - 1);

      if (response.error) {
        return {data: [], error: response.error};
      }

      const pageRows = (response.data ?? []).map((row: any) => ({
        manufacturerId: row.manufacturerId,
        manufacturerName: row.manufacturer?.name ?? 'Unknown maker',
        hp: typeof row.hp === 'number' ? row.hp : 0,
        standardName: row.standardMeta?.name ?? 'Unknown standard',
        created: row.created ?? row.updated ?? '',
        updated: row.updated
      }));

      rows.push(...pageRows);

      if (pageRows.length < pageSize) {
        break;
      }
      offset += pageSize;
    }

    return {data: rows, error: null};
  }




  private buildModuleInsights(rows: PublicModuleInsightRow[]): PublicApplicationModuleInsights {
    const manufacturerCounts = new Map<string, number>();
    const activeManufacturerCounts = new Map<string, number>();
    const manufacturerStats = new Map<string, ManufacturerInsightStats>();
    const standardCounts = new Map<string, number>();
    const standardActivityCounts = new Map<string, number>();
    const standardWidthStats = new Map<string, {totalHp: number; totalModules: number}>();
    const standardManufacturers = new Map<string, Set<string>>();
    const hpBandCounts = new Map<string, number>();
    const hpBandActivityCounts = new Map<string, number>();
    const hpExactCounts = new Map<number, number>();
    const lastThirtyDaysIso = this.getLastThirtyDaysIso();
    const lastSevenDaysIso = this.getLastNDaysStartDate(7).toISOString();
    const lastNinetyDaysIso = this.getLastNDaysStartDate(90).toISOString();
    const lastThreeSixtyFiveDaysIso = this.getLastNDaysStartDate(365).toISOString();
    const lastTwoYearsIso = this.getLastNDaysStartDate(365 * 2).toISOString();
    const lastThreeYearsIso = this.getLastNDaysStartDate(365 * 3).toISOString();
    const hpValues: number[] = [];
    const catalogueAgeYears: number[] = [];
    let updatedLast7Days = 0;
    let updatedLast30Days = 0;
    let updatedLast90Days = 0;
    let updatedLast365Days = 0;
    let createdLast365Days = 0;
    let createdLastTwoYears = 0;
    let createdLastThreeYears = 0;

    rows.forEach((row) => {
      manufacturerCounts.set(
        row.manufacturerName,
        (manufacturerCounts.get(row.manufacturerName) ?? 0) + 1
      );
      manufacturerStats.set(row.manufacturerName, {
        totalModules: (manufacturerStats.get(row.manufacturerName)?.totalModules ?? 0) + 1,
        totalHp: (manufacturerStats.get(row.manufacturerName)?.totalHp ?? 0) + row.hp,
        oneUModules: (manufacturerStats.get(row.manufacturerName)?.oneUModules ?? 0)
          + (isOneUStandard(row.standardName) ? 1 : 0)
      });
      standardCounts.set(
        row.standardName,
        (standardCounts.get(row.standardName) ?? 0) + 1
      );
      standardWidthStats.set(row.standardName, {
        totalHp: (standardWidthStats.get(row.standardName)?.totalHp ?? 0) + row.hp,
        totalModules: (standardWidthStats.get(row.standardName)?.totalModules ?? 0) + 1
      });
      const makersForStandard = standardManufacturers.get(row.standardName) ?? new Set<string>();
      makersForStandard.add(row.manufacturerName);
      standardManufacturers.set(row.standardName, makersForStandard);
      hpBandCounts.set(
        getHpBandLabel(row.hp),
        (hpBandCounts.get(getHpBandLabel(row.hp)) ?? 0) + 1
      );

      if (row.updated >= lastThirtyDaysIso) {
        activeManufacturerCounts.set(
          row.manufacturerName,
          (activeManufacturerCounts.get(row.manufacturerName) ?? 0) + 1
        );
        standardActivityCounts.set(
          row.standardName,
          (standardActivityCounts.get(row.standardName) ?? 0) + 1
        );
        hpBandActivityCounts.set(
          getHpBandLabel(row.hp),
          (hpBandActivityCounts.get(getHpBandLabel(row.hp)) ?? 0) + 1
        );
        updatedLast30Days += 1;
      }

      if (row.updated >= lastSevenDaysIso) {
        updatedLast7Days += 1;
      }

      if (row.updated >= lastNinetyDaysIso) {
        updatedLast90Days += 1;
      }

      if (row.updated >= lastThreeSixtyFiveDaysIso) {
        updatedLast365Days += 1;
      }

      if (row.created) {
        const createdDate = new Date(row.created);
        if (!Number.isNaN(createdDate.getTime())) {
          catalogueAgeYears.push(
            Math.max(0, (this.getNow().getTime() - createdDate.getTime()) / (365 * 24 * 60 * 60 * 1000))
          );
        }
      }

      if (row.created >= lastThreeSixtyFiveDaysIso) {
        createdLast365Days += 1;
      } else if (row.created >= lastTwoYearsIso) {
        createdLastTwoYears += 1;
      } else if (row.created >= lastThreeYearsIso) {
        createdLastThreeYears += 1;
      }

      if (row.hp > 0) {
        hpValues.push(row.hp);
        hpExactCounts.set(row.hp, (hpExactCounts.get(row.hp) ?? 0) + 1);
      }
    });

    const sortedHpValues = [...hpValues].sort((a, b) => a - b);
    const averageHp = sortedHpValues.length > 0
      ? Math.round(sortedHpValues.reduce((sum, value) => sum + value, 0) / sortedHpValues.length)
      : 0;
    const medianHp = sortedHpValues.length > 0
      ? sortedHpValues[Math.floor(sortedHpValues.length / 2)]
      : 0;
    const manufacturerModuleCounts = [...manufacturerCounts.values()].sort((a, b) => a - b);
    const topFiveManufacturerShare = rows.length > 0
      ? Math.round((manufacturerModuleCounts.slice(-5).reduce((sum, count) => sum + count, 0) / rows.length) * 100)
      : 0;
    const soloManufacturerCount = manufacturerModuleCounts.filter((count) => count === 1).length;
    const medianModulesPerManufacturer = manufacturerModuleCounts.length > 0
      ? manufacturerModuleCounts[Math.floor(manufacturerModuleCounts.length / 2)]
      : 0;
    const sortedCatalogueAgeYears = [...catalogueAgeYears].sort((a, b) => a - b);
    const medianCatalogueAgeYears = sortedCatalogueAgeYears.length > 0
      ? Math.round(sortedCatalogueAgeYears[Math.floor(sortedCatalogueAgeYears.length / 2)])
      : 0;

    return {
      topManufacturers: rankBuckets(
        manufacturerCounts,
        5,
        (count) => `${ count } public modules`
      ),
      activeManufacturers: rankBuckets(
        activeManufacturerCounts,
        5,
        (count) => `${ count } modules updated in the last 30 days`
      ),
      widestManufacturers: rankManufacturerScores(
        manufacturerStats,
        (stats) => stats.totalModules >= 5 ? Math.round(stats.totalHp / stats.totalModules) : null,
        (stats, score) => `${ score } HP average across ${ stats.totalModules } public modules`
      ),
      oneUManufacturers: rankManufacturerScores(
        manufacturerStats,
        (stats) => stats.totalModules >= 5 && stats.oneUModules >= 2
          ? Math.round((stats.oneUModules / stats.totalModules) * 100)
          : null,
        (stats, score) => `${ score }% 1U share across ${ stats.totalModules } public modules`
      ),
      standardMix: rankBuckets(
        standardCounts,
        standardCounts.size,
        (count) => `${ count } public modules in this format`
      ),
      standardActivity: rankBuckets(
        standardActivityCounts,
        Math.min(5, standardActivityCounts.size),
        (count) => `${ count } modules updated in the last 30 days`
      ),
      standardWidthAverages: rankBuckets(
        new Map(
          [...standardWidthStats.entries()].map(([label, stats]) => [
            label,
            stats.totalModules > 0 ? Math.round(stats.totalHp / stats.totalModules) : 0
          ])
        ),
        Math.min(5, standardWidthStats.size),
        (count) => `${ count } HP average width`
      ),
      standardManufacturerCounts: rankBuckets(
        new Map(
          [...standardManufacturers.entries()].map(([label, makers]) => [
            label,
            makers.size
          ])
        ),
        Math.min(5, standardManufacturers.size),
        (count) => `${ count } makers represented in this format`
      ),
      hpBands: rankOrderedBuckets(
        hpBandCounts,
        HP_BAND_ORDER,
        (count) => `${ count } modules in this size band`
      ),
      hpBandActivity: rankOrderedBuckets(
        hpBandActivityCounts,
        HP_BAND_ORDER,
        (count) => `${ count } modules updated in the last 30 days`
      ),
      hpExact: rankNumberBuckets(
        hpExactCounts,
        8,
        (count) => `${ count } modules at this exact width`
      ),
      freshnessWindows: [
        {label: 'Updated in 7 days', count: updatedLast7Days, detail: `${ updatedLast7Days } public modules updated in the last week`},
        {label: 'Updated in 30 days', count: updatedLast30Days, detail: `${ updatedLast30Days } public modules updated in the last month`},
        {label: 'Updated in 90 days', count: updatedLast90Days, detail: `${ updatedLast90Days } public modules updated in the last quarter`},
        {label: 'Updated in 365 days', count: updatedLast365Days, detail: `${ updatedLast365Days } public modules updated in the last year`}
      ],
      createdWindows: [
        {label: 'Added in last year', count: createdLast365Days, detail: `${ createdLast365Days } public modules were added in the last year`},
        {label: 'Added 1-2 years ago', count: createdLastTwoYears, detail: `${ createdLastTwoYears } public modules were added one to two years ago`},
        {label: 'Added 2-3 years ago', count: createdLastThreeYears, detail: `${ createdLastThreeYears } public modules were added two to three years ago`},
        {label: 'Added over 3 years ago', count: Math.max(rows.length - createdLast365Days - createdLastTwoYears - createdLastThreeYears, 0), detail: `${ Math.max(rows.length - createdLast365Days - createdLastTwoYears - createdLastThreeYears, 0) } public modules were added over three years ago`}
      ],
      topFiveManufacturerShare,
      soloManufacturerCount,
      medianModulesPerManufacturer,
      medianCatalogueAgeYears,
      staleModules: Math.max(rows.length - updatedLast365Days, 0),
      averageHp,
      medianHp
    };
  }



  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules'))),
    maxCacheCount: 20,
  })
  getApplicationModuleInsights(): Observable<PublicApplicationModuleInsights> {
    return rxFrom((async () => {
      const response = await this.fetchAllPublicModuleInsightRows();
      if (response.error) {
        throw response.error;
      }
      return this.buildModuleInsights(response.data);
    })());
  }
}
