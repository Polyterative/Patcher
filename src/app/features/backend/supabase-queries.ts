import {
  forkJoin,
  from as rxFrom,
  Observable,
  of
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
  PublicUserContributorStats
} from './supabase-queries.models';

export type {
  CurrentUserContributorStats,
  PublicApplicationActivityPoint,
  PublicApplicationInsightsSnapshot,
  PublicApplicationModuleInsightBucket,
  PublicApplicationModuleInsights,
  PublicApplicationStatistics,
  PublicUserContributorStats
} from './supabase-queries.models';
import {
  ManufacturerModuleStats,
  ModuleActivityRow,
  PublicModuleInsightRow,
  ManufacturerInsightStats
} from './supabase-queries.types';
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


export class SupabaseQueriesService {
  private static readonly PUBLIC_AUTHOR_GATE_ALIAS = 'author_profile_gate';
  private static readonly MAX_QUERY_ROWS = 500;
  
  private static readonly EMPTY_STATS: ManufacturerModuleStats = {
    moduleCount: 0,
    latestModuleUpdatedAt: null,
    latestModuleUpdatedAtMs: null,
    changedModulesLast30Days: 0
  };

  private static readonly EMPTY_CONTRIBUTOR_STATS: CurrentUserContributorStats = {
    modulesSubmitted: 0,
    approvedModules: 0,
    pendingModules: 0,
    commentsPosted: 0,
    moduleFlagsSubmitted: 0
  };

  constructor(
    private supabase: SupabaseClient<Database>,
    private getUserSession$: () => Observable<SimpleUserModel | null>,
    private defaultPag: number
  ) {
  }

  private countRows(
    table:
      | typeof DbPaths.modules
      | typeof DbPaths.comments
      | typeof DbPaths.module_flags
      | typeof DbPaths.manufacturers
      | typeof DbPaths.patch_connections
      | typeof DbPaths.profiles
      | typeof DbPaths.racks
      | typeof DbPaths.patches,
    applyFilters: (query: any) => any
  ): Observable<number> {
    return rxFrom(
      applyFilters(this.supabase.from(table))
    ).pipe(
      remapErrors(),
      map((result: any) => result.count ?? 0)
    );
  }

  private getLastThirtyDaysIso(): string {
    return this.getLastNDaysStartDate(30).toISOString();
  }

  private getNow(): Date {
    return new Date();
  }

  private getLastNDaysStartDate(days: number): Date {
    const startDate = this.getNow();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - Math.max(days - 1, 0));
    return startDate;
  }

  private async fetchAllRows<T>(
    table:
      | typeof DbPaths.modules
      | typeof DbPaths.racks
      | typeof DbPaths.patches
      | typeof DbPaths.manufacturers,
    buildQuery: (query: any) => any
  ): Promise<{data: T[]; error: any}> {
    const pageSize = SupabaseQueriesService.MAX_QUERY_ROWS;
    const rows: T[] = [];
    let offset = 0;

    while (true) {
      const response = await buildQuery(this.supabase.from(table))
        .range(offset, offset + pageSize - 1);

      if (response.error) {
        return {data: [], error: response.error};
      }

      const pageRows = (response.data ?? []) as T[];
      rows.push(...pageRows);

      if (pageRows.length < pageSize) {
        break;
      }
      offset += pageSize;
    }

    return {data: rows, error: null};
  }

  private async fetchAllUpdatedRows(
    table:
      | typeof DbPaths.modules
      | typeof DbPaths.racks
      | typeof DbPaths.patches,
    buildQuery: (query: any) => any
  ): Promise<{data: {updated: string}[]; error: any}> {
    const pageSize = SupabaseQueriesService.MAX_QUERY_ROWS;
    const rows: {updated: string}[] = [];
    let offset = 0;

    while (true) {
      const response = await buildQuery(this.supabase.from(table))
        .order('updated', {ascending: true})
        .order('id', {ascending: true})
        .range(offset, offset + pageSize - 1);

      if (response.error) {
        return {data: [], error: response.error};
      }

      const pageRows = (response.data ?? [])
        .map((row: any) => ({updated: row.updated}))
        .filter((row: {updated: string}) => !!row.updated);

      rows.push(...pageRows);

      if (pageRows.length < pageSize) {
        break;
      }
      offset += pageSize;
    }

    return {data: rows, error: null};
  }

  private buildPublicActivitySeries(
    days: number,
    startDate: Date,
    modules: {updated: string}[],
    racks: {updated: string}[],
    patches: {updated: string}[]
  ): PublicApplicationActivityPoint[] {
    const points = Array.from({length: days}, (_, index) => {
      const pointDate = new Date(startDate);
      pointDate.setUTCDate(startDate.getUTCDate() + index);
      return {
        date: pointDate.toISOString().slice(0, 10),
        modules: 0,
        racks: 0,
        patches: 0
      };
    });

    const pointsByDate = new Map(points.map((point) => [point.date, point]));
    const increment = (rows: {updated: string}[], key: 'modules' | 'racks' | 'patches') => {
      rows.forEach((row) => {
        const dateKey = row.updated.slice(0, 10);
        const point = pointsByDate.get(dateKey);
        if (point) {
          point[key] += 1;
        }
      });
    };

    increment(modules, 'modules');
    increment(racks, 'racks');
    increment(patches, 'patches');

    return points;
  }

  private async fetchAllPublicModuleInsightRows(): Promise<{
    data: PublicModuleInsightRow[];
    error: any;
  }> {
    const pageSize = SupabaseQueriesService.MAX_QUERY_ROWS;
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


  private stripPublicAuthorGate<T>(response: any) {
    const gateAlias = SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS;
    const data = Array.isArray(response?.data)
      ? response.data.map((row: any) => {
        if (!row || typeof row !== 'object') {
          return row;
        }
        const {
          [gateAlias]: _gate,
          ...sanitizedRow
        } = row;
        return sanitizedRow as T;
      })
      : response?.data;

    return {
      ...response,
      data
    };
  }
  
  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules'))),
    maxCacheCount: 50,
    // async: true
  })
  getModules(
    from = 0,
    to: number = this.defaultPag,
    name?: string,
    orderBy?: string,
    orderDirection?: string,
    manufacturerId?: number,
    withHP?: number,
    withHpCondition?: "=" | ">" | "<" | ">=" | "<=" | "!=" | undefined,
    standard: number | undefined = undefined,
    description?: string,
    onlyPublic = true,
    tagIds?: number[]) {
    const nameQuery = (name ?? '').trim();
    const descriptionQuery = (description ?? '').trim();
    const requiresClientTextFiltering = nameQuery.length > 0 || descriptionQuery.length > 0;
    const hasTagFilter = tagIds && tagIds.length > 0;
    const moduleTagsJoin = hasTagFilter
      ? `tags:${ DbPaths.module_tags }!inner(id,tag:${ DbPaths.tags }(*),voteCount:${ DbPaths.user_module_tags }(moduletagid))`
      : QueryJoins.module_tags;

    const applyBaseFilters = (builtQuery: any, applyTextFilters = false) => {
      let nextQuery = builtQuery;

      if (onlyPublic === true) {
        nextQuery = nextQuery.filter('public', 'eq', true);
      }

      if (withHP) {
        if (withHpCondition === '=' || withHpCondition === undefined) {
          nextQuery = nextQuery.filter('hp', 'eq', withHP);
        } else if (withHpCondition === '>') {
          nextQuery = nextQuery.filter('hp', 'gt', withHP);
        } else if (withHpCondition === '<') {
          nextQuery = nextQuery.filter('hp', 'lt', withHP);
        } else if (withHpCondition === '>=') {
          nextQuery = nextQuery.filter('hp', 'gte', withHP);
        } else if (withHpCondition === '<=') {
          nextQuery = nextQuery.filter('hp', 'lte', withHP);
        } else if (withHpCondition === '!=') {
          nextQuery = nextQuery.filter('hp', 'neq', withHP);
        } else {
          nextQuery = nextQuery.filter('hp', 'eq', withHP);
        }
      }

      if (manufacturerId) {
        nextQuery = nextQuery.filter('manufacturerId', 'eq', manufacturerId);
      }

      if (standard !== undefined) {
        nextQuery = nextQuery.filter('standard', 'eq', standard);
      }

      if (applyTextFilters) {
        if (nameQuery.length > 0) {
          nextQuery = nextQuery.ilike('name', `%${ escapeIlikePattern(nameQuery) }%`);
        }

        if (descriptionQuery.length > 0) {
          nextQuery = nextQuery.ilike('description', `%${ escapeIlikePattern(descriptionQuery) }%`);
        }
      }

      if (hasTagFilter) {
        nextQuery = (nextQuery as any).filter(`${ DbPaths.module_tags }.tagid`, 'in', `(${ tagIds.join(',') })`);
      }

      return nextQuery;
    };

    const buildDetailedQuery = (query: any) => applyBaseFilters(
      query.select(`
                    id,name,hp,description,public,created,updated,
                    ${ QueryJoins.manufacturer },
                    ${ QueryJoins.standard },
                    ${ QueryJoins.module_panels },
                    ${ moduleTagsJoin }
                  `, {count: 'exact'})
    )
      .order(`color`, {foreignTable: DbPaths.module_panels, ascending: true})
      .limit(1, {foreignTable: DbPaths.module_panels})
      .order(orderBy ? orderBy : 'name', {ascending: orderDirection === 'asc'});

    const buildSearchRowsQuery = (query: any, applyTextFilters = false) => {
      const lightweightSelect = hasTagFilter
        ? `id,name,description,${ DbPaths.module_tags }!inner(id)`
        : 'id,name,description';

      return applyBaseFilters(
        query.select(lightweightSelect, {count: 'exact'}),
        applyTextFilters
      ).order(orderBy ? orderBy : 'name', {ascending: orderDirection === 'asc'});
    };

    if (!requiresClientTextFiltering) {
      return rxFrom(buildDetailedQuery(this.supabase.from(DbPaths.modules)).range(from, to))
        .pipe(remapErrors());
    }

    return rxFrom((async () => {
      const filterPredicate = (module: any) =>
        matchesSearchQuery(nameQuery, module?.name)
        && matchesSearchQuery(descriptionQuery, module?.description);

      const narrowedSearchResponse = await this.fetchAllRows<any>(
        DbPaths.modules,
        (query: any) => buildSearchRowsQuery(query, true)
      );
      if (narrowedSearchResponse.error) {
        return narrowedSearchResponse;
      }

      let filteredSearchRows = applyClientSideSearchFilter(
        {
          ...narrowedSearchResponse,
          count: narrowedSearchResponse.data.length
        },
        from,
        to,
        filterPredicate
      );

      if (filteredSearchRows.count === 0) {
        const fallbackSearchResponse = await this.fetchAllRows<any>(
          DbPaths.modules,
          (query: any) => buildSearchRowsQuery(query, false)
        );
        if (fallbackSearchResponse.error) {
          return fallbackSearchResponse;
        }

        filteredSearchRows = applyClientSideSearchFilter(
          {
            ...fallbackSearchResponse,
            count: fallbackSearchResponse.data.length
          },
          from,
          to,
          filterPredicate
        );
      }

      if (filteredSearchRows.count === 0) {
        return filteredSearchRows;
      }

      const pageIds = (filteredSearchRows.data ?? [])
        .map((module: any) => module?.id)
        .filter((id: number | undefined): id is number => Number.isFinite(id));

      if (pageIds.length === 0) {
        return {
          ...filteredSearchRows,
          data: []
        };
      }

      const detailResponse = await buildDetailedQuery(this.supabase.from(DbPaths.modules))
        .filter('id', 'in', `(${ pageIds.join(',') })`)
        .range(0, pageIds.length - 1);
      if (detailResponse.error) {
        return detailResponse;
      }

      const detailRows = Array.isArray(detailResponse.data) ? detailResponse.data : [];
      const orderedPageRows = pageIds
        .map((id) => detailRows.find((row: any) => row?.id === id))
        .filter(Boolean);

      return {
        ...detailResponse,
        data: orderedPageRows,
        count: filteredSearchRows.count
      };
    })()).pipe(remapErrors());
  }
  
  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches'))),
    maxCacheCount: 50,
  })
  getCurrentUserPatchesForAuthor(authorid: string): Observable<Patch[]> {
    return rxFrom(
      this.supabase.from(DbPaths.patches)
        .select(`*, ${ QueryJoins.author }`)
        .filter('authorid', 'eq', authorid)
        .order('updated', {ascending: false})
    ).pipe(
      remapErrors(),
      map(x => (x.data as Patch[]) ?? [])
    );
  }
  
  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId'))),
    maxCacheCount: 50,
  })
  getCurrentUserRacksForAuthor(authorid: string): Observable<Rack[]> {
    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(`*, ${ QueryJoins.author }`)
        .filter('authorid', 'eq', authorid)
        .order('updated', {ascending: false})
    ).pipe(
      remapErrors(),
      map(x => (x.data as Rack[]) ?? [])
    );
  }
  
  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches'))),
    maxCacheCount: 50,
  })
  getUserPatchesPaginated(from = 0, to: number = this.defaultPag) {
    return this.getUserSession$().pipe(
      switchMap(user => rxFrom(
        this.supabase.from(DbPaths.patches)
          .select(`*, ${ QueryJoins.author }`, {count: 'exact'})
          .filter('authorid', 'eq', user.id)
          .order('updated', {ascending: false})
          .range(from, to)
      )),
      remapErrors(),
    );
  }

  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPublicUserPatchesPaginated(authorId: string, from = 0, to: number = this.defaultPag) {
    return rxFrom(
      this.supabase.from(DbPaths.patches)
        .select(`*, ${ QueryJoins.author }`, {count: 'exact'})
        .filter('authorid', 'eq', authorId)
        .filter('public', 'eq', true)
        .order('updated', {ascending: false})
        .range(from, to)
    ).pipe(
      remapErrors()
    );
  }

  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId'))),
    maxCacheCount: 50,
  })
  getUserRacksPaginated(from = 0, to: number = this.defaultPag) {
    return this.getUserSession$().pipe(
      switchMap(user => rxFrom(
        this.supabase.from(DbPaths.racks)
          .select(`*, ${ QueryJoins.author }`, {count: 'exact'})
          .filter('authorid', 'eq', user.id)
          .order('updated', {ascending: false})
          .range(from, to)
      )),
      remapErrors(),
    );
  }

  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('racksMinimal') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPublicUserRacksPaginated(authorId: string, from = 0, to: number = this.defaultPag) {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS);

    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(`*, ${ QueryJoins.author }, ${ publicAuthorGateJoin }`, {count: 'exact'})
        .filter('authorid', 'eq', authorId)
        .filter('public', 'eq', true)
        .filter(`${ SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
        .order('updated', {ascending: false})
        .range(from, to)
    ).pipe(
      remapErrors(),
      map(response => this.stripPublicAuthorGate<Rack>(response))
    );
  }

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPublicRackWithId(id: number, columns = '*') {
    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(`${ columns }, ${ QueryJoins.author }`)
        .filter('id', 'eq', id)
        .filter('public', 'eq', true)
        .single()
    )
      .pipe(remapErrors());
  }

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('rackWithId'))),
    maxCacheCount: 50,
  })
  getRackWithId(id: number, columns = '*') {
    return rxFrom(
      this.supabase.from(DbPaths.racks)
        .select(`${ columns }, ${ QueryJoins.author }`)
        .filter('id', 'eq', id)
        .single()
    )
      .pipe(
        remapErrors()
      );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('racksMinimal'))),
    maxCacheCount: 50,
  })
  getRacksMinimal(
    from: number = 0,
    to?: number,
    name?: string,
    orderBy?: string,
    orderDirection?: string
  ) {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS);
    const effectiveTo = to ?? this.defaultPag;
    const nameQuery = (name ?? '').trim();
    
    const columns = [
      "id",
      "name",
      "hp",
      "rows",
      "description",
      "created",
      "updated",
      "authorid",
      QueryJoins.author,
      publicAuthorGateJoin,
      "image"
    ].join(",");
    
    let query = this.supabase.from(DbPaths.racks)
      .select(`${ columns }, rack_modules!inner(rackid)`, {count: "exact"})
      .filter("public", "eq", true)
      .filter(`${ SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
      .order(orderBy ? orderBy : "name", {ascending: orderDirection === "asc"});
    
    if (nameQuery.length === 0) {
      query = query.range(from, effectiveTo);
    }
    
    return rxFrom(query)
      .pipe(
        remapErrors(),
        map(response => this.stripPublicAuthorGate<Rack>(response)),
        map((response: any) => {
          if (nameQuery.length === 0) {
            return response;
          }
          
          return applyClientSideSearchFilter(response, from, effectiveTo, (rack: any) =>
            matchesSearchQuery(nameQuery, rack?.name)
          );
        })
      );
  }
  
  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('currentUserComments'))),
    maxCacheCount: 50,
  })
  getCurrentUserComments(
    from = 0,
    to: number = this.defaultPag
  ) {
    return this.getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          this.supabase.from(DbPaths.comments)
            .select(`*,profile:profiles(id,username)`, {count: 'exact'})
            .filter('authorId', 'eq', user.id)
            .order('created', {ascending: false})
            .range(from, to)
        )),
        remapErrors(),
      );
  }

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x =>
      x.includes('modules')
      || x.includes('comments')
      || x.includes('module_flags')
    )),
    maxCacheCount: 50,
  })
  getCurrentUserContributorStats(): Observable<CurrentUserContributorStats> {
    return this.getUserSession$()
      .pipe(
        switchMap(user => {
          if (!user?.id) {
            return of(SupabaseQueriesService.EMPTY_CONTRIBUTOR_STATS);
          }

          return forkJoin({
            modulesSubmitted: this.countRows(
              DbPaths.modules,
              query => query
                .select('id', {count: 'exact', head: true})
                .filter('submitter', 'eq', user.id)
            ),
            approvedModules: this.countRows(
              DbPaths.modules,
              query => query
                .select('id', {count: 'exact', head: true})
                .filter('submitter', 'eq', user.id)
                .filter('isApproved', 'eq', true)
            ),
            commentsPosted: this.countRows(
              DbPaths.comments,
              query => query
                .select('id', {count: 'exact', head: true})
                .filter('authorId', 'eq', user.id)
            ),
            moduleFlagsSubmitted: this.countRows(
              DbPaths.module_flags,
              query => query
                .select('id', {count: 'exact', head: true})
                .filter('user_id', 'eq', user.id)
            ),
          }).pipe(
            map((stats) => ({
              ...stats,
              pendingModules: Math.max(stats.modulesSubmitted - stats.approvedModules, 0)
            }))
          );
        })
      );
  }

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPublicUserContributorStats(authorId: string): Observable<PublicUserContributorStats> {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS);

    return this.countRows(
      DbPaths.modules,
      query => query
        .select(`id, ${ publicAuthorGateJoin }`, {count: 'exact', head: true})
        .filter('submitter', 'eq', authorId)
        .filter('public', 'eq', true)
        .filter('isApproved', 'eq', true)
        .filter(`${ SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
    ).pipe(
      map((approvedPublicModules) => ({approvedPublicModules}))
    );
  }

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches') || x.includes('profiles'))),
    maxCacheCount: 50,
  })
  getPublicPatchWithId(id: number, columns = '*') {
    return rxFrom(
      this.supabase.from(DbPaths.patches)
        .select(`${ columns }, ${ QueryJoins.author }`)
        .filter('id', 'eq', id)
        .filter('public', 'eq', true)
        .single()
    )
      .pipe(remapErrors());
  }

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x =>
      x.includes('modules')
      || x.includes('manufacturers')
      || x.includes('patches')
      || x.includes('profiles')
      || x.includes('rackWithId')
      || x.includes('racksMinimal')
    )),
    maxCacheCount: 20,
  })
  getApplicationStatistics(): Observable<PublicApplicationStatistics> {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS);
    const connectedPatchJoin = 'patch_connections!inner(patchid)';
    const publicPatchJoin = 'patch:patches!patch_connections_patchid_fkey!inner(id)';
    const lastThirtyDaysIso = this.getLastThirtyDaysIso();

    return forkJoin({
      publicModules: this.countRows(
        DbPaths.modules,
        query => query
          .select('id', {count: 'exact', head: true})
          .filter('public', 'eq', true)
      ),
      publicModulesUpdatedLast30Days: this.countRows(
        DbPaths.modules,
        query => query
          .select('id', {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter('updated', 'gte', lastThirtyDaysIso)
      ),
      publicManufacturers: this.countRows(
        DbPaths.manufacturers,
        query => query
          .select('id, public_modules:modules!inner(id)', {count: 'exact', head: true})
          .filter('public_modules.public', 'eq', true)
      ),
      publicProfiles: this.countRows(
        DbPaths.profiles,
        query => query
          .select('id', {count: 'exact', head: true})
          .filter('public', 'eq', true)
      ),
      publicRacks: this.countRows(
        DbPaths.racks,
        query => query
          .select(`id, ${ publicAuthorGateJoin }`, {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter(`${ SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
      ),
      publicRacksUpdatedLast30Days: this.countRows(
        DbPaths.racks,
        query => query
          .select(`id, ${ publicAuthorGateJoin }`, {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter(`${ SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
          .filter('updated', 'gte', lastThirtyDaysIso)
      ),
      publicRackAuthors: this.countRows(
        DbPaths.profiles,
        query => query
          .select('id, public_racks:racks!inner(id)', {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter('public_racks.public', 'eq', true)
      ),
      publicPatches: this.countRows(
        DbPaths.patches,
        query => query
          .select(`id, ${ connectedPatchJoin }`, {count: 'exact', head: true})
          .filter('public', 'eq', true)
      ),
      publicPatchesUpdatedLast30Days: this.countRows(
        DbPaths.patches,
        query => query
          .select(`id, ${ connectedPatchJoin }`, {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter('updated', 'gte', lastThirtyDaysIso)
      ),
      publicPatchConnections: this.countRows(
        DbPaths.patch_connections,
        query => query
          .select(`patchid, ${ publicPatchJoin }`, {count: 'exact', head: true})
          .filter('patch.public', 'eq', true)
      ),
      publicPatchAuthors: this.countRows(
        DbPaths.profiles,
        query => query
          .select('id, public_patches:patches!inner(id, patch_connections!inner(patchid))', {count: 'exact', head: true})
          .filter('public', 'eq', true)
          .filter('public_patches.public', 'eq', true)
      )
    });
  }

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules')
      || x.includes('patches')
      || x.includes('profiles')
      || x.includes('rackWithId')
      || x.includes('racksMinimal')
    )),
    maxCacheCount: 20,
  })
  getApplicationActivitySeries(days = 30): Observable<PublicApplicationActivityPoint[]> {
    const publicAuthorGateJoin = QueryJoins.publicAuthorGate(SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS);
    const connectedPatchJoin = 'patch_connections!inner(patchid)';
    const startDate = this.getLastNDaysStartDate(days);
    const startIso = startDate.toISOString();

    return rxFrom((async () => {
      const [modulesResponse, racksResponse, patchesResponse] = await Promise.all([
        this.fetchAllUpdatedRows(
          DbPaths.modules,
          query => query
            .select('id,updated')
            .filter('public', 'eq', true)
            .filter('updated', 'gte', startIso)
        ),
        this.fetchAllUpdatedRows(
          DbPaths.racks,
          query => query
            .select(`id,updated,${ publicAuthorGateJoin }`)
            .filter('public', 'eq', true)
            .filter(`${ SupabaseQueriesService.PUBLIC_AUTHOR_GATE_ALIAS }.public`, 'eq', true)
            .filter('updated', 'gte', startIso)
        ),
        this.fetchAllUpdatedRows(
          DbPaths.patches,
          query => query
            .select(`id,updated,${ connectedPatchJoin }`)
            .filter('public', 'eq', true)
            .filter('updated', 'gte', startIso)
        )
      ]);

      if (modulesResponse.error) { throw modulesResponse.error; }
      if (racksResponse.error) { throw racksResponse.error; }
      if (patchesResponse.error) { throw patchesResponse.error; }

      return this.buildPublicActivitySeries(
        days,
        startDate,
        modulesResponse.data,
        racksResponse.data,
        patchesResponse.data
      );
    })());
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

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('modules')
      || x.includes('patches')
      || x.includes('profiles')
      || x.includes('rackWithId')
      || x.includes('racksMinimal')
    )),
    maxCacheCount: 20,
  })
  getApplicationInsightsSnapshot(days = 30): Observable<PublicApplicationInsightsSnapshot> {
    return rxFrom(
      this.supabase.rpc('get_application_insights_snapshot', {
        p_days: days
      })
    ).pipe(
      remapErrors(),
      map((response: any) => {
        const snapshot = response?.data?.[0] ?? {};

        return {
          statistics: (snapshot.statistics ?? {
            publicModules: 0,
            publicManufacturers: 0,
            publicProfiles: 0,
            publicModulesUpdatedLast30Days: 0,
            publicRacks: 0,
            publicRackAuthors: 0,
            publicRacksUpdatedLast30Days: 0,
            publicPatches: 0,
            publicPatchConnections: 0,
            publicPatchAuthors: 0,
            publicPatchesUpdatedLast30Days: 0
          }) as PublicApplicationStatistics,
          activitySeries: (snapshot.activity_series ?? []) as PublicApplicationActivityPoint[],
          moduleInsights: (snapshot.module_insights ?? {
            topManufacturers: [],
            activeManufacturers: [],
            widestManufacturers: [],
            oneUManufacturers: [],
            standardMix: [],
            standardActivity: [],
            standardWidthAverages: [],
            standardManufacturerCounts: [],
            hpBands: [],
            hpBandActivity: [],
            hpExact: [],
            freshnessWindows: [],
            createdWindows: [],
            topFiveManufacturerShare: 0,
            soloManufacturerCount: 0,
            medianModulesPerManufacturer: 0,
            medianCatalogueAgeYears: 0,
            staleModules: 0,
            averageHp: 0,
            medianHp: 0
          }) as PublicApplicationModuleInsights
        };
      })
    );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patches'))),
    maxCacheCount: 50,
    async: true
  })
  getPatches(
    from = 0,
    to: number = this.defaultPag,
    name?: string,
    orderBy?: string,
    orderDirection?: string,
    columns: string = `id,name,description,${ QueryJoins.author },updated,created`
  ) {
    const connections = `,patch_connections!inner(patchid,a,b)`; // Ensures only patches with connections are included
    const nameQuery = (name ?? '').trim();
    
    let queryBuilder = this.supabase
      .from(DbPaths.patches)
      .select(`${ columns + connections }`, {count: 'exact'})
      .filter("public", "eq", true)
      .order(orderBy ?? 'name', {ascending: orderDirection === 'asc'});

    if (nameQuery.length === 0) {
      queryBuilder = queryBuilder.range(from, to);
    }

    return rxFrom(queryBuilder)
      .pipe(
        remapErrors(),
        map((response: any) => {
          if (nameQuery.length === 0) {
            return response;
          }
          
          return applyClientSideSearchFilter(response, from, to, (patch: any) =>
            matchesSearchQuery(nameQuery, patch?.name)
          );
        })
      );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patchConnections'))),
    maxCacheCount: 50,
    async: true
  })
  getPatchConnections(patchid: number) {
    return rxFrom(
      this.supabase.from(DbPaths.patch_connections)
        .select(`
          *,
          ${ QueryJoins.patch },
          a(*,module:modules!moduleOUTs_moduleId_fkey(*, ${ QueryJoins.manufacturer },${ QueryJoins.module_panels })),
          b(*,module:modules!moduleINs_moduleId_fkey(*,${ QueryJoins.manufacturer },${ QueryJoins.module_panels }))
          `)
        .filter('patchid', 'eq', patchid)
        .order('ordinal')
    )
      .pipe(
        remapErrors(),
        map((x => x.data))
      );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('patchModuleInstances'))),
    maxCacheCount: 50,
    async: true
  })
  getPatchModuleInstances(patch_id: number) {
    return rxFrom(
      this.supabase.from(DbPaths.patch_module_instances)
        .select('id,patch_id,module_id,instance_label,module:modules(name,manufacturer:manufacturers(name))')
        .filter('patch_id', 'eq', patch_id)
        .order('id')
    ).pipe(
      remapErrors(),
      map(x => x.data as PatchModuleInstance[])
    );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('moduleWithId'))),
    maxCacheCount: 50
  })
  getModuleWithId(id: number, columns = `*,
           ${ QueryJoins.manufacturer },
            ${ QueryJoins.standard },
            ${ QueryJoins.insOuts },
            ${ QueryJoins.module_tags },
            ${ QueryJoins.module_panels }
            `) {
    let queryBuilder$ = this.supabase.from(DbPaths.modules)
      .select(columns)
      .filter('id', 'eq', id);
    
    if (columns.includes(QueryJoins.module_panels)) {
      queryBuilder$ = queryBuilder$.order(`color`, {
        referencedTable: DbPaths.module_panels,
        ascending: true
      });
    }
    
    if (columns.includes(QueryJoins.insOuts)) {
      queryBuilder$ = queryBuilder$
        .order('id', {referencedTable: DbPaths.moduleINs})
        .order('id', {referencedTable: DbPaths.moduleOUTs});
    }
    
    
    return rxFrom(queryBuilder$.single())
      .pipe(
        remapErrors()
      );
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('comments'))),
    maxCacheCount: 100,
    async: true
  })
  getComments(
    entityId: number,
    entityType: number,
    from = 0,
    to = 24
  ): Observable<{ data: DbComment[] | null; count: number | null }> {
    return rxFrom(
      this.supabase.from(DbPaths.comments)
        .select(`*,profile:profiles(id,username)`, { count: 'exact' })
        .filter('entityId', 'eq', entityId)
        .filter('entityType', 'eq', entityType)
        .order('created', { ascending: false })
        .range(from, to)
    )
      .pipe(
        remapErrors(),
        map(x => ({ data: x.data, count: x.count }))
      );
  }
  
  @Cacheable({
    maxAge: longCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('manufacturers'))),
  })
  getManufacturers(from = 0, to = this.defaultPag, columns = '*', orderBy?: string) {
    return rxFrom(
      this.fetchManufacturersRange(
        this.normalizePaginationBound(from),
        this.normalizePaginationBound(to, this.defaultPag),
        columns,
        orderBy ? orderBy : 'name'
      )
    )
      .pipe(
        remapErrors()
      );
  }

  private async fetchManufacturersRange(
    from: number,
    to: number,
    columns: string,
    orderBy: string
  ): Promise<{ data: any[]; error: null; count: number | null } | { data: any[] | null; error: any; count: number | null }> {
    const safeTo = Math.max(from, to);
    const data: any[] = [];
    let count: number | null = null;

    for (let chunkFrom = from; chunkFrom <= safeTo; chunkFrom += SupabaseQueriesService.MAX_QUERY_ROWS) {
      const chunkTo = Math.min(chunkFrom + SupabaseQueriesService.MAX_QUERY_ROWS - 1, safeTo);
      const response = await this.supabase.from(DbPaths.manufacturers)
        .select(columns, {count: 'exact'})
        .range(chunkFrom, chunkTo)
        .order(orderBy);

      if (response.error) {
        return {
          data: response.data,
          error: response.error,
          count: response.count ?? count
        };
      }

      if (count === null) {
        count = response.count ?? null;
      }

      const chunkData = Array.isArray(response.data) ? response.data : [];
      data.push(...chunkData);

      if (chunkData.length < (chunkTo - chunkFrom + 1)) {
        break;
      }
    }

    return {
      data,
      error: null,
      count
    };
  }

  private normalizePaginationBound(value: number | undefined, fallback: number = 0): number {
    const normalized = Number.isFinite(value) ? Math.trunc(value as number) : fallback;
    return Math.max(0, normalized);
  }
  
  getManufacturersPaginated(
    from: number = 0,
    to?: number,
    name?: string,
    orderBy: string = 'name',
    orderDirection: string = 'asc'
  ) {
    const effectiveTo = to ?? this.defaultPag;
    const nameQuery = (name ?? '').trim();
    
    if (orderBy === 'module_updated') {
      return this.getManufacturersPaginatedByModuleActivity(
        from,
        effectiveTo,
        nameQuery,
        orderDirection
      );
    }
    
    let query = this.supabase.from(DbPaths.manufacturers)
      .select('id,name,logo,websiteURL,adminUser', {count: 'exact'})
      .order(orderBy, {ascending: orderDirection === 'asc'});
    
    if (nameQuery.length === 0) {
      query = query.range(from, effectiveTo);
    }
    
    return rxFrom(query).pipe(
      remapErrors(),
      switchMap((response: any) => {
        const filteredResponse = nameQuery.length > 0
          ? applyClientSideSearchFilter(response, from, effectiveTo, (manufacturer: any) =>
            matchesSearchQuery(nameQuery, manufacturer?.name)
          )
          : response;
        const manufacturers = Array.isArray(filteredResponse?.data) ? filteredResponse.data : [];
        if (manufacturers.length === 0) {
          return rxFrom(Promise.resolve(filteredResponse));
        }
        
        const manufacturerIds = manufacturers
          .map((x: any) => x.id)
          .filter((id: unknown): id is number => typeof id === 'number');
        if (manufacturerIds.length === 0) {
          return rxFrom(Promise.resolve(filteredResponse));
        }
        
        return rxFrom((async () => {
          const modulesActivityResponse = await this.fetchAllModuleActivityRowsForManufacturers(manufacturerIds);
          if (modulesActivityResponse.error) {
            return {
              ...filteredResponse,
              error: modulesActivityResponse.error
            };
          }
          const statsByManufacturerId = this.buildManufacturerModuleStats(modulesActivityResponse.data);
          return {
            ...filteredResponse,
            data: manufacturers.map((manufacturer: any) =>
              this.withManufacturerModuleStats(
                manufacturer,
                statsByManufacturerId.get(manufacturer.id)
              )
            )
          };
        })());
      })
    );
  }
  
  private getManufacturersPaginatedByModuleActivity(
    from: number,
    to: number,
    nameQuery: string,
    orderDirection: string
  ) {
    return rxFrom((async () => {
      const manufacturersQuery = this.supabase.from(DbPaths.manufacturers)
        .select('id,name,logo,websiteURL,adminUser', {count: 'exact'})
        .order('name', {ascending: true});

      const manufacturersResponse = await manufacturersQuery;
      if (manufacturersResponse.error) {
        return manufacturersResponse;
      }
      
      const manufacturers = (manufacturersResponse.data ?? []).filter((manufacturer: any) =>
        matchesSearchQuery(nameQuery, manufacturer?.name)
      );
      if (manufacturers.length === 0) {
        return {
          ...manufacturersResponse,
          count: 0,
          data: []
        };
      }
      
      const manufacturerIds = manufacturers
        .map(x => x.id)
        .filter((id): id is number => typeof id === 'number');
      
      if (manufacturerIds.length === 0) {
        return {
          ...manufacturersResponse,
          count: manufacturersResponse.count ?? 0,
          data: []
        };
      }
      
      const effectiveOrderDirection: 'asc' | 'desc' = orderDirection === 'asc' ? 'asc' : 'desc';
      const modulesActivityResponse = await this.fetchAllModuleActivityRowsGlobally(
        effectiveOrderDirection
      );
      if (modulesActivityResponse.error) {
        return {
          ...manufacturersResponse,
          error: modulesActivityResponse.error
        };
      }
      
      const allowedManufacturerIds = new Set<number>(manufacturerIds);
      const filteredActivityRows = modulesActivityResponse.data
        .filter((row) => allowedManufacturerIds.has(row.manufacturerId));
      
      const statsByManufacturerId = this.buildManufacturerModuleStats(filteredActivityRows);
      const activityRankByManufacturerId = this.buildManufacturerActivityRank(filteredActivityRows);
      const sortedManufacturers = [...manufacturers].sort((a, b) =>
        this.compareManufacturersByLatestModuleActivity(
          a,
          b,
          activityRankByManufacturerId
        )
      );
      const pagedManufacturers = sortedManufacturers
        .slice(from, to + 1)
        .map((manufacturer: any) =>
          this.withManufacturerModuleStats(
            manufacturer,
            statsByManufacturerId.get(manufacturer.id)
          )
        );

      return {
        ...manufacturersResponse,
        count: manufacturers.length,
        data: pagedManufacturers
      };
    })());
  }
  
  private async fetchAllModuleActivityRows(
    orderDirection: 'asc' | 'desc' = 'desc',
    manufacturerIds?: number[]
  ): Promise<{
    data: {
      manufacturerId: number;
      updated: string
    }[];
    error: any
  }> {
    const pageSize = SupabaseQueriesService.MAX_QUERY_ROWS;
    const rows: {
      manufacturerId: number;
      updated: string
    }[] = [];
    const chunkSize = 200;
    
    const idChunks: (number[] | null)[] = manufacturerIds
      ? Array.from({length: Math.ceil(manufacturerIds.length / chunkSize)}, (_, i) =>
        manufacturerIds.slice(i * chunkSize, (i + 1) * chunkSize))
      : [null]; // null means "no IN filter" (global fetch)
    
    for (const chunk of idChunks) {
      let offset = 0;
      while (true) {
        let q = this.supabase.from(DbPaths.modules)
          .select('id,manufacturerId,updated')
          .order('updated', {ascending: orderDirection === 'asc'})
          .order('id', {ascending: orderDirection === 'asc'})
          .range(offset, offset + pageSize - 1);
        
        if (chunk) { q = q.in('manufacturerId', chunk); }
        
        const response = await q;
        if (response.error) { return {data: [], error: response.error}; }
        
        const pageRows = (response.data ?? []).map((x: any) => ({
          manufacturerId: x.manufacturerId,
          updated: x.updated
        }));
        rows.push(...pageRows);
        
        if (pageRows.length < pageSize) { break; }
        offset += pageSize;
      }
    }
    return {data: rows, error: null};
  }
  
  private async fetchAllModuleActivityRowsForManufacturers(
    manufacturerIds: number[],
    orderDirection: 'asc' | 'desc' = 'desc'
  ) {
    return this.fetchAllModuleActivityRows(orderDirection, manufacturerIds);
  }
  
  private async fetchAllModuleActivityRowsGlobally(orderDirection: 'asc' | 'desc' = 'desc') {
    return this.fetchAllModuleActivityRows(orderDirection);
  }
  
  private buildManufacturerActivityRank(rows: ModuleActivityRow[]): Map<number, number> {
    const rankByManufacturerId = new Map<number, number>();
    let rank = 0;
    
    for (const row of rows) {
      if (typeof row?.manufacturerId !== 'number') {
        continue;
      }
      if (!rankByManufacturerId.has(row.manufacturerId)) {
        rankByManufacturerId.set(row.manufacturerId, rank);
        rank += 1;
      }
    }
    
    return rankByManufacturerId;
  }
  
  private parseModuleUpdatedTimestampMs(rawUpdated: unknown): number | null {
    if (typeof rawUpdated !== 'string' || rawUpdated.trim().length === 0) { return null; }
    let s = rawUpdated.trim();
    // Normalise Postgres variants so Date.parse can handle them:
    // 1. Space separator → T  (e.g. "2026-03-01 10:00:00" → "2026-03-01T10:00:00")
    s = s.replace(' ', 'T');
    // 2. Truncate microseconds to milliseconds  (.123456 → .123)
    s = s.replace(/(\.\d{3})\d+/, '$1');
    // 3. Short UTC offset without minutes: +00 / -05 → +00:00 / -05:00
    s = s.replace(/([+-]\d{2})$/, '$1:00');
    // 4. Four-digit offset without colon: +0000 → +00:00
    s = s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const ms = Date.parse(s);
    return isNaN(ms) ? null : ms;
  }
  
  private buildManufacturerModuleStats(rows: ModuleActivityRow[]): Map<number, ManufacturerModuleStats> {
    const stats = new Map<number, ManufacturerModuleStats>();
    const thresholdMs = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    for (const row of rows) {
      if (typeof row?.manufacturerId !== 'number') {
        continue;
      }
      const current = stats.get(row.manufacturerId) ?? {...SupabaseQueriesService.EMPTY_STATS};
      current.moduleCount += 1;
      
      const updatedMs = this.parseModuleUpdatedTimestampMs(row.updated);
      if (updatedMs !== null) {
        if (current.latestModuleUpdatedAtMs === null || updatedMs > current.latestModuleUpdatedAtMs) {
          current.latestModuleUpdatedAtMs = updatedMs;
          current.latestModuleUpdatedAt = row.updated;
        }
        if (updatedMs >= thresholdMs) {
          current.changedModulesLast30Days += 1;
        }
      }
      
      stats.set(row.manufacturerId, current);
    }
    
    return stats;
  }
  
  private withManufacturerModuleStats(manufacturer: any, stats: ManufacturerModuleStats | undefined) {
    return {
      ...manufacturer,
      moduleCount: stats?.moduleCount ?? 0,
      latestModuleUpdatedAt: stats?.latestModuleUpdatedAt ?? null,
      changedModulesLast30Days: stats?.changedModulesLast30Days ?? 0
    };
  }
  
  private compareManufacturersByLatestModuleActivity(
    aManufacturer: any,
    bManufacturer: any,
    activityRankByManufacturerId: Map<number, number>
  ): number {
    const aRank = activityRankByManufacturerId.get(aManufacturer.id);
    const bRank = activityRankByManufacturerId.get(bManufacturer.id);
    const aHasModules = typeof aRank === 'number';
    const bHasModules = typeof bRank === 'number';
    const aName = (aManufacturer?.name ?? '').toString();
    const bName = (bManufacturer?.name ?? '').toString();
    
    // Keep manufacturers with modules before empty ones in both directions.
    if (aHasModules !== bHasModules) {
      return aHasModules ? -1 : 1;
    }
    
    if (!aHasModules || !bHasModules) {
      return aName.localeCompare(bName);
    }
    
    if (aRank !== bRank) {
      return (aRank as number) - (bRank as number);
    }
    
    return aName.localeCompare(bName);
  }
  
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('currentUserModules'))),
    maxCacheCount: 50
  })
  getCurrentUserModules(
    includeInsOuts = true,
    includeManuals = false,
    orderConfig?: Partial<CurrentUserModulesOrderConfig>,
  ): Observable<any> {
    const prefix = `module`;
    const panelsTable: string = `${ prefix }.${ DbPaths.module_panels }`;
    
    
    const moduleColumns = `id,name,hp,description,public,created,updated,manufacturerId,standard,isApproved`;
    
     const columns = [
       moduleColumns,
       QueryJoins.manufacturer,
       QueryJoins.module_tags,
       QueryJoins.module_panels,
     ];
    // can be optimized to avoid calling it all the time but for now it is ok
    if (includeInsOuts) {
      columns.push(QueryJoins.insOuts);
    }
    
    if (includeManuals) {
      columns.push('manualURL');
    }
    
    const safeOrderConfig = this.getSafeCurrentUserModulesOrderConfig(orderConfig);
    
    return this.getUserSession$().pipe(
      switchMap(user => {
        let queryBuilder = this.supabase.from(DbPaths.user_modules)
          .select(
            `collectionUpdated:updated,
              ${ prefix }:modules!user_modules_moduleid_fkey(
                ${ columns.join(',') })`
          )
          .order(`color`, {
            foreignTable: panelsTable,
            ascending: true
          })
          .limit(1, {foreignTable: panelsTable})
          .filter('profileid', 'eq', user.id);
        
        if (safeOrderConfig.key === 'moduleName') {
          queryBuilder = queryBuilder
            .order('name', {
              foreignTable: prefix,
              ascending: safeOrderConfig.direction === 'asc'
            })
            .order('id', {
              foreignTable: prefix,
              ascending: true
            });
        } else {
          queryBuilder = queryBuilder
            .order('updated', {ascending: safeOrderConfig.direction === 'asc'})
            .order('name', {
              foreignTable: prefix,
              ascending: true
            })
            .order('id', {
              foreignTable: prefix,
              ascending: true
            });
        }
        
        return rxFrom(queryBuilder).pipe(
          remapErrors(),
          map((x: any) => (x.data ?? []).map((y: any) => ({
            ...y.module,
            collectionUpdated: y.collectionUpdated
          })))
        );
      }),
    );
  }
  
  private getSafeCurrentUserModulesOrderConfig(
    orderConfig?: Partial<CurrentUserModulesOrderConfig>
  ): CurrentUserModulesOrderConfig {
    const key: CurrentUserModulesOrderKey = orderConfig?.key === 'moduleName'
      ? 'moduleName'
      : 'collectionUpdated';
    
    const direction: CurrentUserModulesOrderDirection = orderConfig?.direction === 'asc'
      ? 'asc'
      : orderConfig?.direction === 'desc'
        ? 'desc'
        : key === 'moduleName'
          ? 'asc'
          : 'desc';
    
    return {key, direction};
  }
  
  @Cacheable({
    maxAge: smallCacheTime,
    cacheBusterObserver: cacheBuster$.pipe(filter(x => x.includes('userModuleTags'))),
  })
  getMyVotes(): Observable<number[]> {
    return this.getUserSession$().pipe(
      switchMap(user => rxFrom(
        this.supabase
          .from(DbPaths.user_module_tags)
          .select('moduletagid')
          .filter('authorid', 'eq', user.id)
      )),
      remapErrors(),
      map(x => ((x.data as any) ?? []).map((row: any) => row.moduletagid as number))
    );
  }
  
  getTags() {
    return rxFrom(
      this.supabase.from(DbPaths.tags)
        .select('*')
    )
      .pipe(
        // remapErrors(),
        map((x => x.data))
      );
  }
  
  @Cacheable({
    maxAge: longCacheTime,
  })
  getAllTagsCached(): Observable<any[]> {
    return rxFrom(
      this.supabase.from(DbPaths.tags)
        .select('*')
        .order('type', {ascending: true})
        .order('name', {ascending: true})
    ).pipe(
      map((x: any) => (x.data ?? []))
    );
  }
}
