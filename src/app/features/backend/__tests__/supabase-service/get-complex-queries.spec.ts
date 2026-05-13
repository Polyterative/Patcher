import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';


function chainable(resolveValue: any = {data: null, error: null}) {
  const m: any = {};
  ['select', 'filter', 'eq', 'neq', 'is', 'in', 'range', 'order', 'limit', 'single',
    'insert', 'update', 'delete', 'upsert'].forEach(method => {
    m[method] = () => m;
  });
  m.then = (res: Function, rej?: Function) =>
    Promise.resolve(resolveValue).then(res as any, rej as any);
  return m;
}

describe('SupabaseService - get complex queries', () => {
  let service: SupabaseService;
  let supabaseClient: any;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as any).supabase;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  describe('get.tagVotesForModule', () => {
    it('should aggregate vote counts per moduleTagId', (done) => {
      const mockRows = [
        {moduletagid: 1},
        {moduletagid: 1},
        {moduletagid: 2}
      ];
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: mockRows, error: null}));
      
      service.get.tagVotesForModule([1, 2]).subscribe({
        next: (result: any[]) => {
          const tag1 = result.find(r => r.moduleTagId === 1);
          const tag2 = result.find(r => r.moduleTagId === 2);
          expect(tag1.count).toBe(2);
          expect(tag2.count).toBe(1);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return an empty array when there are no votes', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [], error: null}));
      
      service.get.tagVotesForModule([1, 2]).subscribe({
        next: (result: any[]) => {
          expect(result.length).toBe(0);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should handle null data response gracefully', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      
      service.get.tagVotesForModule([1]).subscribe({
        next: (result: any[]) => {
          expect(result.length).toBe(0);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.statistics', () => {
    it('should return a tuple of [moduleCount, rackCount, patchCount]', (done) => {
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'modules') return chainable({data: [], count: 150, error: null});
        if (table === 'racks') return chainable({data: [], count: 75, error: null});
        return chainable({data: [], count: 40, error: null}); // patches
      });
      
      service.get.statistics().subscribe({
        next: ([modules, racks, patches]: any) => {
          expect(modules).toBe(150);
          expect(racks).toBe(75);
          expect(patches).toBe(40);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('GET.applicationStatistics', () => {
    it('should return public-safe aggregate counts for modules, manufacturers, public profiles, freshness, shared racks/patches, public connections, and public authors', (done) => {
      const modulesQuery = chainable({data: [], count: 150, error: null});
      const recentModulesQuery = chainable({data: [], count: 63, error: null});
      const manufacturersQuery = chainable({data: [], count: 28, error: null});
      const publicProfilesQuery = chainable({data: [], count: 80, error: null});
      const racksQuery = chainable({data: [], count: 24, error: null});
      const recentRacksQuery = chainable({data: [], count: 9, error: null});
      const rackAuthorsQuery = chainable({data: [], count: 12, error: null});
      const patchesQuery = chainable({data: [], count: 11, error: null});
      const recentPatchesQuery = chainable({data: [], count: 5, error: null});
      const patchConnectionsQuery = chainable({data: [], count: 48, error: null});
      const patchAuthorsQuery = chainable({data: [], count: 7, error: null});

      const modulesFilterSpy = spyOn(modulesQuery, 'filter').and.callThrough();
      const recentModulesFilterSpy = spyOn(recentModulesQuery, 'filter').and.callThrough();
      const manufacturersFilterSpy = spyOn(manufacturersQuery, 'filter').and.callThrough();
      const publicProfilesFilterSpy = spyOn(publicProfilesQuery, 'filter').and.callThrough();
      const racksFilterSpy = spyOn(racksQuery, 'filter').and.callThrough();
      const recentRacksFilterSpy = spyOn(recentRacksQuery, 'filter').and.callThrough();
      const rackAuthorsFilterSpy = spyOn(rackAuthorsQuery, 'filter').and.callThrough();
      const patchesFilterSpy = spyOn(patchesQuery, 'filter').and.callThrough();
      const recentPatchesFilterSpy = spyOn(recentPatchesQuery, 'filter').and.callThrough();
      const patchConnectionsFilterSpy = spyOn(patchConnectionsQuery, 'filter').and.callThrough();
      const patchAuthorsFilterSpy = spyOn(patchAuthorsQuery, 'filter').and.callThrough();
      const manufacturersSelectSpy = spyOn(manufacturersQuery, 'select').and.callThrough();
      const rackAuthorsSelectSpy = spyOn(rackAuthorsQuery, 'select').and.callThrough();
      const patchesSelectSpy = spyOn(patchesQuery, 'select').and.callThrough();
      const patchConnectionsSelectSpy = spyOn(patchConnectionsQuery, 'select').and.callThrough();
      const patchAuthorsSelectSpy = spyOn(patchAuthorsQuery, 'select').and.callThrough();
      let modulesCallCount = 0;
      let profilesCallCount = 0;
      let racksCallCount = 0;
      let patchesCallCount = 0;

      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'modules') return modulesCallCount++ === 0 ? modulesQuery : recentModulesQuery;
        if (table === 'manufacturers') return manufacturersQuery;
        if (table === 'profiles') {
          if (profilesCallCount === 0) {
            profilesCallCount++;
            return publicProfilesQuery;
          }
          return profilesCallCount++ === 1 ? rackAuthorsQuery : patchAuthorsQuery;
        }
        if (table === 'racks') return racksCallCount++ === 0 ? racksQuery : recentRacksQuery;
        if (table === 'patch_connections') return patchConnectionsQuery;
        return patchesCallCount++ === 0 ? patchesQuery : recentPatchesQuery;
      });

      service.GET.applicationStatistics().subscribe({
        next: (result: any) => {
          expect(result).toEqual({
            publicModules: 150,
            publicModulesUpdatedLast30Days: 63,
            publicManufacturers: 28,
            publicProfiles: 80,
            publicRacks: 24,
            publicRackAuthors: 12,
            publicRacksUpdatedLast30Days: 9,
            publicPatches: 11,
            publicPatchConnections: 48,
            publicPatchAuthors: 7,
            publicPatchesUpdatedLast30Days: 5
          });
          expect(modulesFilterSpy).toHaveBeenCalledWith('public', 'eq', true);
          expect(recentModulesFilterSpy).toHaveBeenCalledWith('updated', 'gte', jasmine.any(String));
          expect(manufacturersFilterSpy).toHaveBeenCalledWith('public_modules.public', 'eq', true);
          expect(publicProfilesFilterSpy).toHaveBeenCalledWith('public', 'eq', true);
          expect(racksFilterSpy).toHaveBeenCalledWith('author_profile_gate.public', 'eq', true);
          expect(recentRacksFilterSpy).toHaveBeenCalledWith('updated', 'gte', jasmine.any(String));
          expect(rackAuthorsFilterSpy).toHaveBeenCalledWith('public_racks.public', 'eq', true);
          expect(recentPatchesFilterSpy).toHaveBeenCalledWith('updated', 'gte', jasmine.any(String));
          expect(patchConnectionsFilterSpy).toHaveBeenCalledWith('patch.public', 'eq', true);
          expect(patchAuthorsFilterSpy).toHaveBeenCalledWith('public_patches.public', 'eq', true);
          expect(manufacturersSelectSpy).toHaveBeenCalledWith(
            jasmine.stringMatching(/public_modules:modules!inner/),
            {count: 'exact', head: true}
          );
          expect(rackAuthorsSelectSpy).toHaveBeenCalledWith(
            jasmine.stringMatching(/public_racks:racks!inner/),
            {count: 'exact', head: true}
          );
          expect(patchesSelectSpy).toHaveBeenCalledWith(
            jasmine.stringMatching(/patch_connections!inner/),
            {count: 'exact', head: true}
          );
          expect(patchConnectionsSelectSpy).toHaveBeenCalledWith(
            jasmine.stringMatching(/patch:patches!patch_connections_patchid_fkey!inner/),
            {count: 'exact', head: true}
          );
          expect(patchAuthorsSelectSpy).toHaveBeenCalledWith(
            jasmine.stringMatching(/public_patches:patches!inner/),
            {count: 'exact', head: true}
          );
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('GET.applicationInsightsSnapshot', () => {
    it('should map the backend snapshot RPC into the page payload shape', (done) => {
      const rpcSpy = spyOn(supabaseClient, 'rpc').and.returnValue(Promise.resolve({
        data: [{
          statistics: {
            publicModules: 150,
            publicManufacturers: 28,
            publicProfiles: 80,
            publicModulesUpdatedLast30Days: 63,
            publicRacks: 24,
            publicRackAuthors: 12,
            publicRacksUpdatedLast30Days: 9,
            publicPatches: 11,
            publicPatchConnections: 48,
            publicPatchAuthors: 7,
            publicPatchesUpdatedLast30Days: 5
          },
          activity_series: [
            {date: '2026-05-01', modules: 4, racks: 1, patches: 0}
          ],
          module_insights: {
            topManufacturers: [{label: 'Make Noise', count: 12, detail: '12 public modules'}],
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
            topFiveManufacturerShare: 44,
            soloManufacturerCount: 3,
            medianModulesPerManufacturer: 5,
            medianCatalogueAgeYears: 2,
            staleModules: 20,
            averageHp: 14,
            medianHp: 12
          }
        }],
        error: null
      }));

      service.GET.applicationInsightsSnapshot(30).subscribe({
        next: (result: any) => {
          expect(rpcSpy).toHaveBeenCalledWith('get_application_insights_snapshot', {p_days: 30});
          expect(result.statistics.publicModules).toBe(150);
          expect(result.activitySeries).toEqual([
            {date: '2026-05-01', modules: 4, racks: 1, patches: 0}
          ]);
          expect(result.moduleInsights.topManufacturers[0]).toEqual({
            label: 'Make Noise',
            count: 12,
            detail: '12 public modules'
          });
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('GET.applicationActivitySeries', () => {
    it('should return daily public-safe activity counts for modules, racks, and connected patches', (done) => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setUTCDate(today.getUTCDate() - 2);
      const yesterday = new Date(today);
      yesterday.setUTCDate(today.getUTCDate() - 1);

      const modulesQuery = chainable({
        data: [
          {id: 1, updated: `${ twoDaysAgo.toISOString().slice(0, 10) }T10:00:00.000Z`},
          {id: 2, updated: `${ twoDaysAgo.toISOString().slice(0, 10) }T16:00:00.000Z`},
          {id: 3, updated: `${ yesterday.toISOString().slice(0, 10) }T09:00:00.000Z`}
        ],
        error: null
      });
      const racksQuery = chainable({
        data: [
          {id: 9, updated: `${ yesterday.toISOString().slice(0, 10) }T08:00:00.000Z`}
        ],
        error: null
      });
      const patchesQuery = chainable({
        data: [
          {id: 12, updated: `${ today.toISOString().slice(0, 10) }T12:30:00.000Z`}
        ],
        error: null
      });

      const modulesFilterSpy = spyOn(modulesQuery, 'filter').and.callThrough();
      const racksFilterSpy = spyOn(racksQuery, 'filter').and.callThrough();
      const patchesFilterSpy = spyOn(patchesQuery, 'filter').and.callThrough();

      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'modules') { return modulesQuery; }
        if (table === 'racks') { return racksQuery; }
        if (table === 'patches') { return patchesQuery; }
        fail(`Unexpected table ${ table }`);
        return chainable();
      });

      service.GET.applicationActivitySeries(3).subscribe({
        next: (result: any[]) => {
          expect(result).toEqual([
            {
              date: twoDaysAgo.toISOString().slice(0, 10),
              modules: 2,
              racks: 0,
              patches: 0
            },
            {
              date: yesterday.toISOString().slice(0, 10),
              modules: 1,
              racks: 1,
              patches: 0
            },
            {
              date: today.toISOString().slice(0, 10),
              modules: 0,
              racks: 0,
              patches: 1
            }
          ]);
          expect(modulesFilterSpy).toHaveBeenCalledWith('public', 'eq', true);
          expect(modulesFilterSpy).toHaveBeenCalledWith('updated', 'gte', jasmine.any(String));
          expect(racksFilterSpy).toHaveBeenCalledWith('public', 'eq', true);
          expect(racksFilterSpy).toHaveBeenCalledWith('author_profile_gate.public', 'eq', true);
          expect(patchesFilterSpy).toHaveBeenCalledWith('public', 'eq', true);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('GET.applicationModuleInsights', () => {
    it('should derive public module insight buckets from public module rows', (done) => {
      spyOn<any>((service as any).queries, 'getNow')
        .and.callFake(() => new Date('2026-05-02T12:00:00.000Z'));
      const modulesQuery = chainable({
        data: [
          {
            id: 1,
            manufacturerId: 1,
            hp: 6,
            created: '2026-04-01T10:00:00.000Z',
            updated: '2026-05-01T10:00:00.000Z',
            manufacturer: {id: 1, name: 'Make Noise'},
            standardMeta: {id: 1, name: '3U'}
          },
          {
            id: 2,
            manufacturerId: 1,
            hp: 14,
            created: '2024-06-01T11:00:00.000Z',
            updated: '2026-05-01T11:00:00.000Z',
            manufacturer: {id: 1, name: 'Make Noise'},
            standardMeta: {id: 1, name: '3U'}
          },
          {
            id: 3,
            manufacturerId: 2,
            hp: 22,
            created: '2023-03-15T09:00:00.000Z',
            updated: '2026-03-15T09:00:00.000Z',
            manufacturer: {id: 2, name: 'Intellijel'},
            standardMeta: {id: 2, name: 'Intellijel 1U'}
          },
          {
            id: 4,
            manufacturerId: 3,
            hp: 34,
            created: '2021-05-02T12:00:00.000Z',
            updated: '2026-05-02T12:00:00.000Z',
            manufacturer: {id: 3, name: 'Noise Engineering'},
            standardMeta: {id: 3, name: 'Pulp Logic 1U'}
          }
        ],
        error: null
      });

      const selectSpy = spyOn(modulesQuery, 'select').and.callThrough();
      const filterSpy = spyOn(modulesQuery, 'filter').and.callThrough();
      spyOn(supabaseClient, 'from').and.returnValue(modulesQuery);

      service.GET.applicationModuleInsights().subscribe({
        next: (result: any) => {
          expect(result.topManufacturers).toEqual([
            {label: 'Make Noise', count: 2, detail: '2 public modules'},
            {label: 'Intellijel', count: 1, detail: '1 public modules'},
            {label: 'Noise Engineering', count: 1, detail: '1 public modules'}
          ]);
          expect(result.activeManufacturers).toEqual([
            {label: 'Make Noise', count: 2, detail: '2 modules updated in the last 30 days'},
            {label: 'Noise Engineering', count: 1, detail: '1 modules updated in the last 30 days'}
          ]);
          expect(result.widestManufacturers).toEqual([]);
          expect(result.oneUManufacturers).toEqual([]);
          expect(result.standardMix).toEqual([
            {label: '3U', count: 2, detail: '2 public modules in this format'},
            {label: 'Intellijel 1U', count: 1, detail: '1 public modules in this format'},
            {label: 'Pulp Logic 1U', count: 1, detail: '1 public modules in this format'}
          ]);
          expect(result.standardActivity).toEqual([
            {label: '3U', count: 2, detail: '2 modules updated in the last 30 days'},
            {label: 'Pulp Logic 1U', count: 1, detail: '1 modules updated in the last 30 days'}
          ]);
          expect(result.standardWidthAverages).toEqual([
            {label: 'Pulp Logic 1U', count: 34, detail: '34 HP average width'},
            {label: 'Intellijel 1U', count: 22, detail: '22 HP average width'},
            {label: '3U', count: 10, detail: '10 HP average width'}
          ]);
          expect(result.standardManufacturerCounts).toEqual([
            {label: '3U', count: 1, detail: '1 makers represented in this format'},
            {label: 'Intellijel 1U', count: 1, detail: '1 makers represented in this format'},
            {label: 'Pulp Logic 1U', count: 1, detail: '1 makers represented in this format'}
          ]);
          expect(result.hpBands).toEqual([
            {label: '6-8 HP', count: 1, detail: '1 modules in this size band'},
            {label: '9-16 HP', count: 1, detail: '1 modules in this size band'},
            {label: '17-28 HP', count: 1, detail: '1 modules in this size band'},
            {label: '29+ HP', count: 1, detail: '1 modules in this size band'}
          ]);
          expect(result.hpBandActivity).toEqual([
            {label: '6-8 HP', count: 1, detail: '1 modules updated in the last 30 days'},
            {label: '9-16 HP', count: 1, detail: '1 modules updated in the last 30 days'},
            {label: '29+ HP', count: 1, detail: '1 modules updated in the last 30 days'}
          ]);
          expect(result.hpExact).toEqual([
            {label: '6 HP', count: 1, detail: '1 modules at this exact width'},
            {label: '14 HP', count: 1, detail: '1 modules at this exact width'},
            {label: '22 HP', count: 1, detail: '1 modules at this exact width'},
            {label: '34 HP', count: 1, detail: '1 modules at this exact width'}
          ]);
          expect(result.freshnessWindows).toEqual([
            {label: 'Updated in 7 days', count: 3, detail: '3 public modules updated in the last week'},
            {label: 'Updated in 30 days', count: 3, detail: '3 public modules updated in the last month'},
            {label: 'Updated in 90 days', count: 4, detail: '4 public modules updated in the last quarter'},
            {label: 'Updated in 365 days', count: 4, detail: '4 public modules updated in the last year'}
          ]);
          expect(result.createdWindows).toEqual([
            {label: 'Added in last year', count: 1, detail: '1 public modules were added in the last year'},
            {label: 'Added 1-2 years ago', count: 1, detail: '1 public modules were added one to two years ago'},
            {label: 'Added 2-3 years ago', count: 0, detail: '0 public modules were added two to three years ago'},
            {label: 'Added over 3 years ago', count: 2, detail: '2 public modules were added over three years ago'}
          ]);
          expect(result.topFiveManufacturerShare).toBe(100);
          expect(result.soloManufacturerCount).toBe(2);
          expect(result.medianModulesPerManufacturer).toBe(1);
          expect(result.medianCatalogueAgeYears).toBe(3);
          expect(result.staleModules).toBe(0);
          expect(result.averageHp).toBe(19);
          expect(result.medianHp).toBe(22);
          expect(selectSpy).toHaveBeenCalledWith('id,hp,created,updated,manufacturer:manufacturerId(id,name),standardMeta:standards!modules_standard_fkey(id,name)');
          expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should continue paginating when Supabase returns a full 500-row page', (done) => {
      spyOn<any>((service as any).queries, 'getNow')
        .and.callFake(() => new Date('2026-05-02T12:00:00.000Z'));
      const firstPage = Array.from({length: 500}, (_, index) => ({
        id: index + 1,
        manufacturerId: 1,
        hp: 10,
        updated: '2026-05-01T10:00:00.000Z',
        manufacturer: {id: 1, name: 'Make Noise'},
        standardMeta: {id: 1, name: '3U'}
      }));
      const secondPage = [
        {
          id: 501,
          manufacturerId: 2,
          hp: 14,
          updated: '2026-05-01T11:00:00.000Z',
          manufacturer: {id: 2, name: 'Intellijel'},
          standardMeta: {id: 1, name: '3U'}
        }
      ];

      const pagedQuery: any = {};
      let lastRangeStart = 0;

      pagedQuery.select = () => pagedQuery;
      pagedQuery.filter = () => pagedQuery;
      pagedQuery.order = () => pagedQuery;
      pagedQuery.range = (start: number) => {
        lastRangeStart = start;
        return Promise.resolve({
          data: start === 0 ? firstPage : secondPage,
          error: null
        });
      };

      spyOn(supabaseClient, 'from').and.returnValue(pagedQuery);

      service.GET.applicationModuleInsights().subscribe({
        next: (result: any) => {
          expect(result.topManufacturers[0]).toEqual({
            label: 'Make Noise',
            count: 500,
            detail: '500 public modules'
          });
          expect(result.topManufacturers[1]).toEqual({
            label: 'Intellijel',
            count: 1,
            detail: '1 public modules'
          });
          expect(result.freshnessWindows).toEqual([
            {label: 'Updated in 7 days', count: 501, detail: '501 public modules updated in the last week'},
            {label: 'Updated in 30 days', count: 501, detail: '501 public modules updated in the last month'},
            {label: 'Updated in 90 days', count: 501, detail: '501 public modules updated in the last quarter'},
            {label: 'Updated in 365 days', count: 501, detail: '501 public modules updated in the last year'}
          ]);
          expect(lastRangeStart).toBe(500);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should only count formats containing 1U in the oneU maker ranking', (done) => {
      const modulesQuery = chainable({
        data: [
          {id: 1, manufacturerId: 1, hp: 8, updated: '2026-05-01T10:00:00.000Z', manufacturer: {id: 1, name: 'Intellijel'}, standardMeta: {id: 1, name: 'Intellijel 1U'}},
          {id: 2, manufacturerId: 1, hp: 8, updated: '2026-05-01T10:00:00.000Z', manufacturer: {id: 1, name: 'Intellijel'}, standardMeta: {id: 1, name: 'Intellijel 1U'}},
          {id: 3, manufacturerId: 1, hp: 20, updated: '2026-05-01T10:00:00.000Z', manufacturer: {id: 1, name: 'Intellijel'}, standardMeta: {id: 3, name: 'Frac'}},
          {id: 4, manufacturerId: 1, hp: 20, updated: '2026-05-01T10:00:00.000Z', manufacturer: {id: 1, name: 'Intellijel'}, standardMeta: {id: 3, name: 'Frac'}},
          {id: 5, manufacturerId: 1, hp: 20, updated: '2026-05-01T10:00:00.000Z', manufacturer: {id: 1, name: 'Intellijel'}, standardMeta: {id: 3, name: 'Frac'}},
          {id: 6, manufacturerId: 2, hp: 18, updated: '2026-05-01T10:00:00.000Z', manufacturer: {id: 2, name: 'Serge Co'}, standardMeta: {id: 4, name: 'Serge'}},
          {id: 7, manufacturerId: 2, hp: 18, updated: '2026-05-01T10:00:00.000Z', manufacturer: {id: 2, name: 'Serge Co'}, standardMeta: {id: 4, name: 'Serge'}},
          {id: 8, manufacturerId: 2, hp: 18, updated: '2026-05-01T10:00:00.000Z', manufacturer: {id: 2, name: 'Serge Co'}, standardMeta: {id: 4, name: 'Serge'}},
          {id: 9, manufacturerId: 2, hp: 18, updated: '2026-05-01T10:00:00.000Z', manufacturer: {id: 2, name: 'Serge Co'}, standardMeta: {id: 4, name: 'Serge'}},
          {id: 10, manufacturerId: 2, hp: 18, updated: '2026-05-01T10:00:00.000Z', manufacturer: {id: 2, name: 'Serge Co'}, standardMeta: {id: 4, name: 'Serge'}}
        ],
        error: null
      });

      spyOn(supabaseClient, 'from').and.returnValue(modulesQuery);

      service.GET.applicationModuleInsights().subscribe({
        next: (result: any) => {
          expect(result.oneUManufacturers).toEqual([
            {label: 'Intellijel', count: 40, detail: '40% 1U share across 5 public modules'}
          ]);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.modulesBySameManufacturer', () => {
    it('should return the data array from the query result', (done) => {
      const mockModules = [{id: 1, name: 'VCO'}, {id: 2, name: 'VCF'}];
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: mockModules, error: null}));
      
      service.get.modulesBySameManufacturer(3).subscribe({
        next: (result: any) => {
          expect(result).toEqual(mockModules);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should apply manufacturer filter', (done) => {
      const mock = chainable({data: [], error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.get.modulesBySameManufacturer(7).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('manufacturerId', 'eq', 7);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should order by updated desc with id desc tie-break', (done) => {
      const mock = chainable({data: [], error: null});
      const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.get.modulesBySameManufacturer(7).subscribe({
        next: () => {
          expect(orderSpy).toHaveBeenCalledWith('updated', {ascending: false});
          expect(orderSpy).toHaveBeenCalledWith('id', {ascending: false});
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.manufacturersPaginated', () => {
    it('should sort by latest module updated timestamp (desc) with +00 offsets', (done) => {
      const manufacturers = [
        {id: 1, name: 'Endorphin.es', logo: null, websiteURL: null, adminUser: null},
        {id: 2, name: 'SD Modular', logo: null, websiteURL: null, adminUser: null}
      ];
      const moduleActivityRows = [
        {id: 11, manufacturerId: 2, updated: '2026-03-01T10:00:00.123456+00'},
        {id: 10, manufacturerId: 1, updated: '2026-02-01T10:00:00.123456+00'}
      ];
      
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'manufacturers') {
          return chainable({data: manufacturers, count: manufacturers.length, error: null});
        }
        if (table === 'modules') {
          return chainable({data: moduleActivityRows, error: null});
        }
        return chainable({data: [], error: null});
      });
      
      service.GET.manufacturersPaginated(0, 19, '', 'module_updated', 'desc').subscribe({
        next: (result: any) => {
          const orderedNames = (result?.data ?? []).map((x: any) => x.name);
          expect(orderedNames).toEqual(['SD Modular', 'Endorphin.es']);
          expect(result?.data?.[0]?.latestModuleUpdatedAt).toBe('2026-03-01T10:00:00.123456+00');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should sort by latest module updated timestamp (desc) with mixed timestamp formats', (done) => {
      const manufacturers = [
        {id: 1, name: 'Older Maker', logo: null, websiteURL: null, adminUser: null},
        {id: 2, name: 'Newer Maker', logo: null, websiteURL: null, adminUser: null},
        {id: 3, name: 'Middle Maker', logo: null, websiteURL: null, adminUser: null}
      ];
      const moduleActivityRows = [
        {id: 22, manufacturerId: 2, updated: '2026-03-01 10:00:00.123456+0000'},
        {id: 23, manufacturerId: 3, updated: '2026-02-20T09:15:00.4Z'},
        {id: 21, manufacturerId: 1, updated: '2026-02-01T10:00:00.123456+00'}
      ];
      
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'manufacturers') {
          return chainable({data: manufacturers, count: manufacturers.length, error: null});
        }
        if (table === 'modules') {
          return chainable({data: moduleActivityRows, error: null});
        }
        return chainable({data: [], error: null});
      });
      
      service.GET.manufacturersPaginated(0, 19, '', 'module_updated', 'desc').subscribe({
        next: (result: any) => {
          const orderedNames = (result?.data ?? []).map((x: any) => x.name);
          expect(orderedNames).toEqual(['Newer Maker', 'Middle Maker', 'Older Maker']);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.racksWithModule', () => {
    it('should complete successfully and pass through result', (done) => {
      const mockData = {data: [{id: 1, rack: {name: 'My Rack'}}], count: 1, error: null};
      spyOn(supabaseClient, 'from').and.returnValue(chainable(mockData));
      
      service.get.racksWithModule(42).subscribe({
        next: (result: any) => {
          expect(result.data).toBeDefined();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should filter by module id', (done) => {
      const mock = chainable({data: [], count: 0, error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.get.racksWithModule(99).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
          expect(filterSpy).toHaveBeenCalledWith('author_profile_gate.public', 'eq', true);
          expect(filterSpy).toHaveBeenCalledWith('rack_modules.moduleid', 'eq', 99);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
});
