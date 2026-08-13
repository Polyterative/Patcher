import type { PostgrestError } from '@supabase/supabase-js';
import type { DbComment } from 'src/app/models/comment';
import type {
  PatchModuleInstance
} from 'src/app/models/connection';
import type { UserModulePossessionKind } from 'src/app/models/module';
import {
  firstValueFrom
} from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import { cacheBuster$ } from '../../supabase.cache';
import type { SupabaseTableRow } from '../../supabase-db.types';
import type {
  PatchGraphModule
} from 'src/app/components/patch-parts/patch-graph/patch-graph-build.models';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  SupabaseQueryChain,
  authUserFixture,
  chainable,
  getSupabaseClientDouble,
  mockUserSession,
  type QueryChainResult,
  type QueryCountRowsResult,
  type QueryListRowsResult,
  type QuerySingleRowResult,
  type SupabaseClientDouble
} from './supabase-query-test-doubles';


type RackIdRow = Pick<SupabaseTableRow<'racks'>, 'id' | 'name'>;
type CommentRow = Pick<DbComment, 'content' | 'id'>;
type CommentsObservableResult = Pick<QueryCountRowsResult<CommentRow>, 'count' | 'data'>;
type ManufacturerRow = Pick<SupabaseTableRow<'manufacturers'>, 'id' | 'name'>;
type PatchConnectionRow = Pick<SupabaseTableRow<'patch_connections'>, 'a' | 'b' | 'patchid'>;
type ModuleIdRow = Pick<SupabaseTableRow<'modules'>, 'id' | 'name'>;
type PatchIdRow = Pick<SupabaseTableRow<'patches'>, 'id' | 'name'>;
type PublicAuthorGateFixture = {
  author_profile_gate: {
    public: boolean;
  };
};
type RackListQueryRow = RackIdRow & PublicAuthorGateFixture;
type CurrentUserModuleSummaryRow = {
  id: number;
  name: string;
};
type CurrentUserModulePossessionRow = {
  collectionUpdated: string | null;
  kind: UserModulePossessionKind;
  module: CurrentUserModuleSummaryRow;
};
type CurrentUserModuleResultRow = CurrentUserModuleSummaryRow & {
  collectionUpdated: string | null;
  possessionKind: UserModulePossessionKind;
};
type CurrentUserModulePossessionOnlyRow = {
  kind: UserModulePossessionKind;
  module: {
    id: number;
  };
};
type CurrentUserModulePossessionOnlyResultRow = {
  id: number;
  possessionKind: UserModulePossessionKind;
};
type CurrentUserCommentRow = Pick<SupabaseTableRow<'comments'>, 'content' | 'id'>;

class MutableResultQueryChain<Row> extends SupabaseQueryChain<Row> {
  constructor(private currentResponse: QueryChainResult<Row>) {
    super(currentResponse);
  }

  setResponse(response: QueryChainResult<Row>): void {
    this.currentResponse = response;
  }

  override then<TResult1 = QueryChainResult<Row>, TResult2 = never>(
    onfulfilled?: ((value: QueryChainResult<Row>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.currentResponse).then(onfulfilled, onrejected);
  }
}

describe('SupabaseService - GET cached delegates', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  describe('GET.rackWithId', () => {
    it('should return rack data for the given id', (done) => {
      const mockRack = {data: {id: 7, name: 'Studio Rack'}, error: null} satisfies QuerySingleRowResult<RackIdRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable<RackIdRow>(mockRack));
      
      service.GET.rackWithId(7).subscribe({
        next: (result: QuerySingleRowResult<RackIdRow>) => {
          expect(result.data.id).toBe(7);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('GET.publicRackWithId', () => {
    it('should return rack data for the given id', (done) => {
      const mockRack = {data: {id: 8, name: 'Public Rack'}, error: null} satisfies QuerySingleRowResult<RackIdRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable<RackIdRow>(mockRack));

      service.GET.publicRackWithId(8).subscribe({
        next: (result: QuerySingleRowResult<RackIdRow>) => {
          expect(result.data.id).toBe(8);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.comments', () => {
    it('should return comments for the given entity', (done) => {
      const mockComments = {data: [{id: 1, content: 'Nice patch!'}], count: null, error: null} satisfies QueryCountRowsResult<CommentRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable<CommentRow>(mockComments));
      
      service.GET.comments(42, 1).subscribe({
        next: (result: CommentsObservableResult) => {
          expect(result).toBeDefined();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.manufacturers', () => {
    it('should return manufacturers list', (done) => {
      const mockMfrs = {
        data: [{id: 1, name: 'Moog'}, {id: 2, name: 'Doepfer'}],
        count: null,
        error: null
      } satisfies QueryCountRowsResult<ManufacturerRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable<ManufacturerRow>(mockMfrs));
      
      service.GET.manufacturers().subscribe({
        next: (result: QueryCountRowsResult<ManufacturerRow>) => {
          expect(result).toBeDefined();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should fetch additional manufacturer pages when the first page is full', (done) => {
      const responses: QueryCountRowsResult<ManufacturerRow>[] = [
        {
          data: Array.from({length: 500}, (_, index) => ({id: index + 1, name: `Maker ${ index + 1 }`})),
          count: 710,
          error: null
        },
        {
          data: [
            {id: 701, name: 'TLM Audio'},
            {id: 702, name: 'TouellSkouarn'}
          ],
          count: 710,
          error: null
        }
      ];
      const seenRanges: Array<[number, number]> = [];

      spyOn(supabaseClient, 'from').and.callFake(() => {
        const mock = new MutableResultQueryChain<ManufacturerRow>({data: [], count: 0, error: null});
        spyOn(mock, 'range').and.callFake((from: number, to: number) => {
          seenRanges.push([from, to]);
          mock.setResponse(responses.shift() ?? {data: [], count: 710, error: null});
          return mock;
        });
        return mock;
      });

      service.GET.manufacturers(0, 9999, 'id,name').subscribe({
        next: (result: QueryCountRowsResult<ManufacturerRow>) => {
          expect(seenRanges).toEqual([[0, 499], [500, 999]]);
          expect(result.data?.length).toBe(502);
          expect(result.data?.[500].name).toBe('TLM Audio');
          expect(result.count).toBe(710);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.patchConnections', () => {
    it('should return patch connections for the given patchid', (done) => {
      const mockConns = {data: [{patchid: 3, a: 10, b: 20}], error: null} satisfies QueryListRowsResult<PatchConnectionRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable<PatchConnectionRow>(mockConns));
      
      service.GET.patchConnections(3).subscribe({
        next: (result: PatchConnectionRow[] | null) => {
          expect(result).toBeDefined();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should select only the id column of the joined patch row', (done) => {
      const mockConns = {data: [{patchid: 3, a: 10, b: 20}], error: null} satisfies QueryListRowsResult<PatchConnectionRow>;
      const mock: SupabaseQueryChain<PatchConnectionRow> = chainable<PatchConnectionRow>(mockConns);
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.GET.patchConnections(3).subscribe({
        next: () => {
          expect(selectSpy).toHaveBeenCalledWith(
            jasmine.stringContaining('patch:patches!patch_connections_patchid_fkey(id)')
          );
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should not select the full joined patch row', (done) => {
      const mockConns = {data: [{patchid: 3, a: 10, b: 20}], error: null} satisfies QueryListRowsResult<PatchConnectionRow>;
      const mock: SupabaseQueryChain<PatchConnectionRow> = chainable<PatchConnectionRow>(mockConns);
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.GET.patchConnections(3).subscribe({
        next: () => {
          expect(selectSpy).not.toHaveBeenCalledWith(
            jasmine.stringContaining('patch:patches!patch_connections_patchid_fkey(*)')
          );
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should select only the rendered CV columns (id,name) for the a/b joins', (done) => {
      const mockConns = {data: [{patchid: 3, a: 10, b: 20}], error: null} satisfies QueryListRowsResult<PatchConnectionRow>;
      const mock: SupabaseQueryChain<PatchConnectionRow> = chainable<PatchConnectionRow>(mockConns);
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.GET.patchConnections(3).subscribe({
        next: () => {
          const selectArg = selectSpy.calls.mostRecent().args[0] as string;
          expect(selectArg).toContain('a(id,name,module:modules!moduleOUTs_moduleId_fkey(id,name,manufacturer:manufacturerId(name),panels:module_panels!module_panels_moduleid_fkey(id,color,filename)))');
          expect(selectArg).toContain('b(id,name,module:modules!moduleINs_moduleId_fkey(id,name,manufacturer:manufacturerId(name),panels:module_panels!module_panels_moduleid_fkey(id,color,filename)))');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should select the module panel columns (id,color,filename) needed to render the connection card thumbnail', (done) => {
      const mockConns = {data: [{patchid: 3, a: 10, b: 20}], error: null} satisfies QueryListRowsResult<PatchConnectionRow>;
      const mock: SupabaseQueryChain<PatchConnectionRow> = chainable<PatchConnectionRow>(mockConns);
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.GET.patchConnections(3).subscribe({
        next: () => {
          const selectArg = selectSpy.calls.mostRecent().args[0] as string;
          expect(selectArg).toContain('panels:module_panels!module_panels_moduleid_fkey(id,color,filename)');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should not select the full wildcard CV or module rows for the a/b joins', (done) => {
      const mockConns = {data: [{patchid: 3, a: 10, b: 20}], error: null} satisfies QueryListRowsResult<PatchConnectionRow>;
      const mock: SupabaseQueryChain<PatchConnectionRow> = chainable<PatchConnectionRow>(mockConns);
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.GET.patchConnections(3).subscribe({
        next: () => {
          const selectArg = selectSpy.calls.mostRecent().args[0] as string;
          expect(selectArg).not.toContain('a(*');
          expect(selectArg).not.toContain('b(*');
          expect(selectArg).not.toContain('modules!moduleOUTs_moduleId_fkey(*');
          expect(selectArg).not.toContain('modules!moduleINs_moduleId_fkey(*');
          expect(selectArg).not.toContain('module_panels_moduleid_fkey(*');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.patchModuleInstances', () => {
    it('should return patch module instances for the given patch_id', (done) => {
      const mockInstances = {
        data: [{id: 1, patch_id: 5, module_id: 10, instance_label: 'VCO'}],
        error: null
      } satisfies QueryListRowsResult<PatchModuleInstance>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable<PatchModuleInstance>(mockInstances));
      
      service.GET.patchModuleInstances(5).subscribe({
        next: (result: PatchModuleInstance[]) => {
          expect(result).toBeDefined();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.moduleWithId', () => {
    it('should return module data for the given id', (done) => {
      const mockModule = {data: {id: 11, name: 'Ripples'}, error: null} satisfies QuerySingleRowResult<ModuleIdRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable<ModuleIdRow>(mockModule));
      
      service.GET.moduleWithId(11).subscribe({
        next: (result: QuerySingleRowResult<ModuleIdRow>) => {
          expect(result).toBeDefined();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.modulesByIdsForPatchGraph', () => {
    it('should batch-select minimal id/name columns via .in instead of per-id .eq', (done) => {
      const mockData: PatchGraphModule[] = [
        {id: 5, name: 'Maths', ins: [{id: 1, name: 'CV In'}], outs: [{id: 2, name: 'CV Out'}]},
        {id: 8, name: 'Ripples', ins: [], outs: []}
      ];
      const mock: SupabaseQueryChain<PatchGraphModule> = chainable<PatchGraphModule>(
        {data: mockData, error: null} satisfies QueryListRowsResult<PatchGraphModule>
      );
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      const inSpy = spyOn(mock, 'in').and.returnValue(mock);
      const eqSpy = spyOn(mock, 'eq').and.returnValue(mock);
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.GET.modulesByIdsForPatchGraph([5, 5, 8]).subscribe({
        next: (result: QueryListRowsResult<PatchGraphModule>) => {
          expect(selectSpy).toHaveBeenCalledWith(
            jasmine.stringContaining('id,name')
          );
          expect(selectSpy).toHaveBeenCalledWith(
            jasmine.stringContaining('ins:module_ins(id,name)')
          );
          expect(selectSpy).toHaveBeenCalledWith(
            jasmine.stringContaining('outs:module_outs(id,name)')
          );
          expect(selectSpy).not.toHaveBeenCalledWith(
            jasmine.stringContaining('ins:module_ins(*)')
          );
          expect(inSpy).toHaveBeenCalledWith('id', [5, 8]);
          expect(eqSpy).not.toHaveBeenCalled();
          expect(filterSpy).not.toHaveBeenCalledWith('id', 'eq', jasmine.anything());
          expect(result.data).toEqual(mockData);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('does not query Supabase for an empty id list', (done) => {
      const fromSpy = spyOn(supabaseClient, 'from');

      service.GET.modulesByIdsForPatchGraph([]).subscribe({
        next: (result: {data: PatchGraphModule[] | null; error: unknown}) => {
          expect(fromSpy).not.toHaveBeenCalled();
          expect(result.data).toEqual([]);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('GET.patches', () => {
    it('should return patches list on default call', (done) => {
      const mockPatches = {data: [{id: 1, name: 'Ambient 1'}], count: 1, error: null} satisfies QueryCountRowsResult<PatchIdRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable<PatchIdRow>(mockPatches));
      
      service.GET.patches().subscribe({
        next: (result: QueryCountRowsResult<PatchIdRow>) => {
          expect(result).toBeDefined();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should apply the name filter client-side when name is provided', (done) => {
      const mock = chainable<PatchIdRow>({
        data: [
          {id: 1, name: 'Ambient Wash'},
          {id: 2, name: 'Perc Loop'}
        ],
        count: 2,
        error: null
      } satisfies QueryCountRowsResult<PatchIdRow>);
      const ilikeSpy = spyOn(mock, 'ilike').and.callThrough();
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.GET.patches(0, 10, 'Ambient').subscribe({
        next: (result: QueryCountRowsResult<PatchIdRow>) => {
          expect(ilikeSpy).not.toHaveBeenCalled();
          expect(result.count).toBe(1);
          expect(result.data).toEqual([{id: 1, name: 'Ambient Wash'}]);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('GET.publicPatchWithId', () => {
    it('should return patch data for the given id', (done) => {
      const mockPatch = {data: {id: 3, name: 'Public Patch'}, error: null} satisfies QuerySingleRowResult<PatchIdRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable<PatchIdRow>(mockPatch));

      service.GET.publicPatchWithId(3).subscribe({
        next: (result: QuerySingleRowResult<PatchIdRow>) => {
          expect(result.data.id).toBe(3);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should not join the author visibility gate for public patch details', (done) => {
      const mock = chainable<PatchIdRow>({data: {id: 3, name: 'Public Patch'}, error: null} satisfies QuerySingleRowResult<PatchIdRow>);
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.GET.publicPatchWithId(3).subscribe({
        next: () => {
          expect(selectSpy.calls.mostRecent().args[0]).not.toContain('author_profile_gate:authorid!inner(public)');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.racksMinimal', () => {
    it('should return racks list on default call', (done) => {
      const mockRacks = {
        data: [{id: 1, name: 'My Rack', author_profile_gate: {public: true}}],
        count: 1,
        error: null
      } satisfies QueryCountRowsResult<RackListQueryRow>;
      spyOn(supabaseClient, 'from').and.returnValue(chainable<RackListQueryRow>(mockRacks));
      
      service.GET.racksMinimal().subscribe({
        next: (result: QueryCountRowsResult<RackIdRow>) => {
          expect(result).toBeDefined();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should apply the name filter client-side when name is provided', (done) => {
      const mock = chainable<RackListQueryRow>({
        data: [
          {id: 1, name: 'Studio Rack', author_profile_gate: {public: true}},
          {id: 2, name: 'Performance Rack', author_profile_gate: {public: true}}
        ],
        count: 2,
        error: null
      } satisfies QueryCountRowsResult<RackListQueryRow>);
      const ilikeSpy = spyOn(mock, 'ilike').and.callThrough();
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.GET.racksMinimal(0, undefined, 'studio').subscribe({
        next: (result: QueryCountRowsResult<RackIdRow>) => {
          expect(ilikeSpy).not.toHaveBeenCalled();
          expect(result.count).toBe(1);
          expect(result.data).toEqual([{id: 1, name: 'Studio Rack'}]);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.currentUserModules', () => {
    it('falls back by default and throws in strict mode when Supabase returns an error response for current user modules', async () => {
      const transientError = {
        code: 'PGRST003',
        details: null,
        hint: null,
        message: 'Service temporarily unavailable',
        name: 'PostgrestError'
      } satisfies PostgrestError;
      mockUserSession(service, authUserFixture('current-user-modules-error'));
      spyOn(supabaseClient, 'from').and.returnValue(chainable<CurrentUserModulePossessionRow>({data: null, error: transientError}));

      await expectAsync(firstValueFrom(
        service.GET.currentUserModules(false, true, {key: 'collectionUpdated', direction: 'asc'})
      )).toBeResolvedTo([]);

      await expectAsync(firstValueFrom(
        service.GET.currentUserModules(false, true, {key: 'collectionUpdated', direction: 'asc'}, true)
      )).toBeRejectedWith(transientError);
    });

    it('returns an empty array for successful empty current user module responses', async () => {
      mockUserSession(service, authUserFixture('current-user-modules-empty'));
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<CurrentUserModulePossessionRow>({data: [], error: null} satisfies QueryListRowsResult<CurrentUserModulePossessionRow>)
      );

      await expectAsync(firstValueFrom(
        service.GET.currentUserModules(false, false, {key: 'collectionUpdated', direction: 'desc'})
      )).toBeResolvedTo([]);
    });

    it('should return current user modules with collectionUpdated metadata', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<CurrentUserModulePossessionRow>({
          data: [
            {
              collectionUpdated: '2026-02-25T12:00:00.000Z',
              kind: 'HAS',
              module: {id: 1, name: 'VCO'}
            }
          ],
          error: null
        } satisfies QueryListRowsResult<CurrentUserModulePossessionRow>)
      );
      
      service.GET.currentUserModules().subscribe({
        next: (result: CurrentUserModuleResultRow[]) => {
          expect(result).toBeDefined();
          expect(result[0].collectionUpdated).toBe('2026-02-25T12:00:00.000Z');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should apply whitelisted backend module name ordering when requested', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      
      const query = chainable<CurrentUserModulePossessionRow>({
        data: [{collectionUpdated: null, kind: 'HAS', module: {id: 1, name: 'VCO'}}],
        error: null
      } satisfies QueryListRowsResult<CurrentUserModulePossessionRow>);
      const orderSpy = spyOn(query, 'order').and.returnValue(query);
      spyOn(supabaseClient, 'from').and.returnValue(query);
      
      service.GET.currentUserModules(true, false, {key: 'moduleName', direction: 'desc'}).subscribe({
        next: () => {
          expect(orderSpy).toHaveBeenCalledWith('name', jasmine.objectContaining({
            foreignTable: 'module',
            ascending: false
          }));
          const hasUserModulesUpdatedOrdering = orderSpy.calls.allArgs().some(args => args[0] === 'updated');
          expect(hasUserModulesUpdatedOrdering).toBeFalse();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('GET.currentUserModulesPossessionOnly', () => {
    it('should select only kind and module id, filtered by profileid', (done) => {
      const user = authUserFixture('u1');
      mockUserSession(service, user);

      const mock: SupabaseQueryChain<CurrentUserModulePossessionOnlyRow> = chainable<CurrentUserModulePossessionOnlyRow>({
        data: [
          {kind: 'HAS', module: {id: 1}},
          {kind: 'WANTS', module: {id: 2}}
        ],
        error: null
      } satisfies QueryListRowsResult<CurrentUserModulePossessionOnlyRow>);
      const selectSpy = spyOn(mock, 'select').and.returnValue(mock);
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.GET.currentUserModulesPossessionOnly().subscribe({
        next: (result: CurrentUserModulePossessionOnlyResultRow[]) => {
          expect(selectSpy).toHaveBeenCalledWith('kind,module:modules!user_modules_moduleid_fkey(id)');
          expect(filterSpy).toHaveBeenCalledWith('profileid', 'eq', user.id);
          expect(result).toEqual([
            {id: 1, possessionKind: 'HAS'},
            {id: 2, possessionKind: 'WANTS'}
          ]);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('caches repeated calls and busts via the shared currentUserModules cache-buster tag', async () => {
      const user = authUserFixture('u2');
      mockUserSession(service, user);

      const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(
        chainable<CurrentUserModulePossessionOnlyRow>({
          data: [{kind: 'HAS', module: {id: 1}}],
          error: null
        } satisfies QueryListRowsResult<CurrentUserModulePossessionOnlyRow>)
      );

      await firstValueFrom(service.GET.currentUserModulesPossessionOnly());
      await firstValueFrom(service.GET.currentUserModulesPossessionOnly());
      expect(fromSpy).toHaveBeenCalledTimes(1);

      cacheBuster$.next(['currentUserModules']);

      await firstValueFrom(service.GET.currentUserModulesPossessionOnly());
      expect(fromSpy).toHaveBeenCalledTimes(2);
    });

    it('returns an empty array for successful empty responses', async () => {
      mockUserSession(service, authUserFixture('current-user-modules-possession-only-empty'));
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<CurrentUserModulePossessionOnlyRow>({data: [], error: null} satisfies QueryListRowsResult<CurrentUserModulePossessionOnlyRow>)
      );

      await expectAsync(firstValueFrom(
        service.GET.currentUserModulesPossessionOnly()
      )).toBeResolvedTo([]);
    });
  });
  
  describe('GET.currentUserComments', () => {
    it('should return current user comments', (done) => {
      mockUserSession(service, authUserFixture('u2'));
      
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<CurrentUserCommentRow>({data: [{id: 1, content: 'Hello'}], error: null} satisfies QueryListRowsResult<CurrentUserCommentRow>)
      );
      
      service.GET.currentUserComments().subscribe({
        next: (result: QueryListRowsResult<CurrentUserCommentRow>) => {
          expect(result).toBeDefined();
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
});
