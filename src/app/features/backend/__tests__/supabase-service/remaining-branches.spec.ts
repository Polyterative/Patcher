import { of } from 'rxjs';
import type { PostgrestError } from '@supabase/supabase-js';
import type { CV, CVwithModule } from 'src/app/models/cv';
import type { PatchConnection } from 'src/app/models/connection';
import type {
  MinimalModule,
  UserModulePossessionKind
} from 'src/app/models/module';
import type { Patch } from 'src/app/models/patch';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  SupabaseService,
  type RichUserModel
} from '../../supabase.service';
import type { SupabaseSignupResult } from '../../supabase.types';
import { cacheBuster$ } from '../../supabase.cache';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  buildCVInserter,
  buildCVUpdater,
  buildPatchConnectionInserter,
  getCvMapper
} from '../../supabase-update';
import {
  authSessionFixture,
  authUserFixture,
  chainable,
  getAuthSessionSubjectDouble,
  getSupabaseClientDouble,
  mockUserSession,
  type AuthSessionSubjectDouble,
  type QueryListRowsResult,
  type SupabaseClientDouble
} from './supabase-query-test-doubles';


type PatchSummaryRow = Pick<Patch, 'id' | 'name'>;
type HiddenUsageBucket = 'none' | 'some' | '5_plus' | '10_plus' | '25_plus';
type ModuleUsageSummaryRow = {
  public_rack_count: number;
  hidden_rack_bucket: HiddenUsageBucket;
  public_patch_count: number;
  hidden_patch_bucket: HiddenUsageBucket;
};
type CurrentUserModulePossessionRow = {
  collectionUpdated: string | null;
  kind: UserModulePossessionKind;
  module: Pick<MinimalModule, 'id' | 'name'>;
};
type RuntimeGetModules = (
  from?: number,
  to?: number,
  name?: string,
  orderBy?: string,
  orderDirection?: string,
  manufacturerId?: number,
  withHP?: number,
  withHpCondition?: string
) => ReturnType<SupabaseService['GET']['modules']>;
type RemainingBranchesRpcRow = PatchSummaryRow | ModuleUsageSummaryRow;
type RemainingBranchesSupabaseClientDouble = SupabaseClientDouble & {
  rpc(name: string, args?: Record<string, unknown>): Promise<QueryListRowsResult<RemainingBranchesRpcRow>>;
};
type AuthStateSubscriptionHarness = {
  unsubscribe: () => void;
};

function postgrestError(code: string, message: string): PostgrestError {
  return {
    code,
    details: null,
    hint: null,
    message,
    name: 'PostgrestError'
  };
}

function patchFixture(id: number): Patch {
  return {
    author: {id: 'author-1', username: 'author'},
    created: '2026-07-21T00:00:00Z',
    id,
    name: `Patch ${ id }`,
    public: true,
    updated: '2026-07-21T00:00:00Z'
  };
}

function minimalModuleFixture(id: number): MinimalModule {
  return {
    created: '2026-07-21T00:00:00Z',
    description: '',
    hp: 4,
    id,
    manufacturer: {id: 1, name: 'Maker'},
    manufacturerId: 1,
    name: `Module ${ id }`,
    panels: [],
    public: true,
    standard: {id: 0, name: 'Eurorack'},
    tags: [],
    updated: '2026-07-21T00:00:00Z'
  };
}

function cvWithModuleFixture(id: number, moduleId: number): CVwithModule {
  return {
    id,
    module: minimalModuleFixture(moduleId),
    name: `CV ${ id }`
  };
}

describe('SupabaseService - Remaining Branches', () => {
  let service: SupabaseService;
  let supabaseClient: RemainingBranchesSupabaseClientDouble;
  let authSession$: AuthSessionSubjectDouble;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service) as RemainingBranchesSupabaseClientDouble;
    authSession$ = getAuthSessionSubjectDouble(service);
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('get.patchesWithModule resolves patch details and handles empty patch lists', (done) => {
    spyOn(supabaseClient, 'rpc').and.returnValues(
      Promise.resolve({data: [{id: 7, name: 'Patch7'}], error: null}),
      Promise.resolve({data: [], error: null})
    );
    
    service.get.patchesWithModule(1).subscribe({
      next: (result: Patch[]) => {
        expect(result[0].id).toBe(7);

        // getPatchesWithModule is @Cacheable on (moduleId, from, to, ...) — bust to force a fresh RPC.
        cacheBuster$.next(['patchesWithModule']);

        service.get.patchesWithModule(1).subscribe({
          next: (emptyResult: Patch[]) => {
            expect(emptyResult).toEqual([]);
            done();
          },
          error: done.fail
        });
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);

  it('get.patchesWithModule calls the dedicated RPC with stable defaults', (done) => {
    const rpcSpy = spyOn(supabaseClient, 'rpc').and.returnValue(Promise.resolve({data: [], error: null}));

    service.get.patchesWithModule(1).subscribe({
      next: () => {
        expect(rpcSpy).toHaveBeenCalledWith('get_public_patches_for_module', {
          p_module_id: 1,
          p_from: 0,
          p_to: 20,
          p_order_by: 'updated',
          p_order_direction: 'desc'
        });
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);

  it('get.patchesWithModule forwards explicit pagination and ordering to the RPC', (done) => {
    const rpcSpy = spyOn(supabaseClient, 'rpc').and.returnValue(Promise.resolve({data: [], error: null}));

    service.get.patchesWithModule(1, 5, 9, 'created', 'asc').subscribe({
      next: () => {
        expect(rpcSpy).toHaveBeenCalledWith('get_public_patches_for_module', {
          p_module_id: 1,
          p_from: 5,
          p_to: 9,
          p_order_by: 'created',
          p_order_direction: 'asc'
        });
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);

  it('get.moduleUsageSummary calls the bucketed RPC and unwraps the first row', (done) => {
    const rpcSpy = spyOn(supabaseClient, 'rpc').and.returnValue(Promise.resolve({
      data: [{
        public_rack_count: 2,
        hidden_rack_bucket: 'some',
        public_patch_count: 3,
        hidden_patch_bucket: '5_plus'
      }],
      error: null
    }));

    service.get.moduleUsageSummary(77).subscribe({
      next: (summary: ModuleUsageSummaryRow) => {
        expect(rpcSpy).toHaveBeenCalledWith('get_module_usage_summary_bucketed', {
          p_module_id: 77
        });
        expect(summary).toEqual({
          public_rack_count: 2,
          hidden_rack_bucket: 'some',
          public_patch_count: 3,
          hidden_patch_bucket: '5_plus'
        });
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);
  
  it('add.moduleOUTs maps moduleid into inserted rows', (done) => {
    const query = chainable({data: [], error: null});
    const insertSpy = spyOn(query, 'insert').and.returnValue(query);
    spyOn(supabaseClient, 'from').and.returnValue(query);
    const moduleOuts: CV[] = [{id: 1, name: 'OutA'}];
    
    service.add.moduleOUTs(moduleOuts, 42).subscribe({
      next: () => {
        expect(insertSpy).toHaveBeenCalledWith([{id: 1, name: 'OutA', moduleid: 42}]);
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);
  
  it('GET.modules falls back to eq filter when HP condition is unknown', (done) => {
    const query = chainable({data: [], count: 0, error: null});
    const filterSpy = spyOn(query, 'filter').and.returnValue(query);
    spyOn(supabaseClient, 'from').and.returnValue(query);
    const getModules = service.GET.modules as RuntimeGetModules;
    
    getModules(0, 10, undefined, undefined, undefined, undefined, 8, 'invalid').subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('hp', 'eq', 8);
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);
  
  it('GET.currentUserModules includes manualURL when includeManuals=true', (done) => {
    mockUserSession(service, authUserFixture('u1'));
    const query = chainable<CurrentUserModulePossessionRow>({
      data: [{collectionUpdated: null, kind: 'HAS', module: {id: 1, name: 'VCO'}}],
      error: null
    });
    const selectSpy = spyOn(query, 'select').and.returnValue(query);
    spyOn(supabaseClient, 'from').and.returnValue(query);
    
    service.GET.currentUserModules(false, true).subscribe({
      next: () => {
        const selectArg = selectSpy.calls.mostRecent().args[0] as string;
        expect(selectArg).toContain('manualURL');
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);
  
  it('handleOAuthCallback creates a profile for first-time OAuth users', (done) => {
    authSession$.next(authSessionFixture({
      ...authUserFixture('oauth-user'),
      created_at: '2026-01-01T00:00:00Z',
      email: 'newuser@example.com',
      updated_at: '2026-01-01T00:00:00Z'
    }));
    spyOn(service.auth, 'getRichUserSession$').and.returnValue(of(null));

    const profileQuery = chainable<Record<string, never>>({data: {}, error: null});
    spyOn(supabaseClient, 'from').and.returnValue(profileQuery);
    
    service.auth.handleOAuthCallback$().subscribe({
      next: (result) => {
        expect(result).toBeNull();
        expect(supabaseClient.from).toHaveBeenCalledWith('profiles');
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);

  it('handleOAuthCallback returns rich user directly when username exists', (done) => {
    const rich: RichUserModel = {
      ...authUserFixture('oauth-u2'),
      id: 'oauth-u2',
      email: 'hasname@example.com',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      username: 'hasname'
    };
    authSession$.next(authSessionFixture({
      ...authUserFixture('oauth-u2'),
      created_at: '2026-01-01T00:00:00Z',
      email: 'hasname@example.com',
      updated_at: '2026-01-01T00:00:00Z'
    }));
    spyOn(service.auth, 'getRichUserSession$').and.returnValue(of(rich));
    
    service.auth.handleOAuthCallback$().subscribe({
      next: (result) => {
        expect(result).toEqual(rich);
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);
  
  it('signup$ errors when provider responds with an error payload', (done) => {
    spyOn(supabaseClient.auth, 'signUp').and.returnValue(
      Promise.resolve({
        data: {user: null, session: null},
        error: {message: 'signup blocked'}
      })
    );
    
    service.auth.signup$('userx', 'u@example.com', 'password').subscribe({
      next: () => {
        fail('Expected signup$ to error');
        done();
      },
      error: (error: Error) => {
        expect(error.message).toContain('signup blocked');
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('signup$ returns pending confirmation when signUp succeeds without a session', (done) => {
    spyOn(supabaseClient.auth, 'signUp').and.returnValue(
      Promise.resolve({
        data: {
          user: {
            id: 'new-user',
            email: 'new@example.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          session: null
        },
        error: null
      })
    );
    
    service.auth.signup$('newname', 'new@example.com', 'password').subscribe({
      next: (result: SupabaseSignupResult) => {
        expect(result).toEqual({
          user: {
            id: 'new-user',
            email: 'new@example.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          requiresEmailConfirmation: true
        });
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);
  
  it('ngOnDestroy unsubscribes auth state subscription when present', () => {
    const unsubscribe = jasmine.createSpy('unsubscribe');
    const subscription: AuthStateSubscriptionHarness = {unsubscribe};
    expect(Reflect.set(service, 'authStateSubscription', subscription)).toBeTrue();
    
    service.ngOnDestroy();
    
    expect(unsubscribe).toHaveBeenCalled();
  });
  
  it('buildPatchConnectionInserter, getCvMapper, buildCVInserter and buildCVUpdater branches', (done) => {
    const insertQuery = chainable({data: [{patchid: 1}], error: null});
    const updateQuery = chainable({data: {}, error: null});
    const fromSpy = spyOn(supabaseClient, 'from').and.callFake((table: string) => {
      if (table === 'patch_connections') {
        return insertQuery;
      }
      return updateQuery;
    });
    
    spyOn(service.delete, 'patchConnectionsForPatch').and.returnValue(of({}));
    const connection: PatchConnection = {
      patch: patchFixture(999),
      a: cvWithModuleFixture(10, 10),
      b: cvWithModuleFixture(20, 20),
      notes: 'n',
      instance_id_a: 1,
      instance_id_b: 2
    };
    const updateClient = supabaseClient as unknown as Parameters<typeof buildPatchConnectionInserter>[0];
    const cvs: CV[] = [{id: 0, name: 'A'}, {id: 2, name: 'B'}];
    
    buildPatchConnectionInserter(updateClient, [connection], (id) => service.delete.patchConnectionsForPatch(id)).subscribe({
      next: () => {
        buildPatchConnectionInserter(updateClient, [], (id) => service.delete.patchConnectionsForPatch(id)).subscribe({
          next: () => {
            const mapper = getCvMapper(77);
            expect(mapper({id: 1, name: 'Mapped'}).moduleid).toBe(77);
            
            const inserters = buildCVInserter(
              updateClient,
              cvs,
              'module_outs',
              77,
              'author-1'
            );
            const updaters = buildCVUpdater(
              updateClient,
              cvs,
              'module_ins',
              77
            );
            
            expect(inserters.length).toBe(1);
            expect(updaters.length).toBe(1);
            expect(fromSpy).toHaveBeenCalled();
            done();
          },
          error: done.fail
        });
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);
  
  it('resetPassword email branch rethrows provider errors and updateUsername maps db errors', (done) => {
    spyOn(supabaseClient.auth, 'resetPasswordForEmail').and.returnValue(
      Promise.resolve({data: null, error: {message: 'smtp down'}})
    );
    
    service.auth.resetPassword$('user@example.com').subscribe({
      next: () => done.fail('expected error'),
      error: (resetErr) => {
        expect(resetErr.message).toBe(SharedConstants.messages.resetPassword.resetFailed);
        expect(resetErr.message).not.toContain('smtp down');

        const uniqueQuery = chainable({data: null, error: postgrestError('23505', 'unique violation')});
        spyOn(supabaseClient, 'from').and.returnValue(uniqueQuery);
        service.auth.updateUsername$('uid-1', 'valid_name').subscribe({
          next: () => done.fail('expected error'),
          error: (err1: Error) => {
            expect(err1.message).toContain('already taken');
            
            const genericQuery = chainable({data: null, error: postgrestError('500', 'db failure')});
            (supabaseClient.from as jasmine.Spy).and.returnValue(genericQuery);
            service.auth.updateUsername$('uid-1', 'valid_name').subscribe({
              next: () => done.fail('expected error'),
              error: (err2: Error) => {
                expect(err2.message).toContain('db failure');
                done();
              }
            });
          }
        });
      }
    });
  }, TEST_TIMEOUT);
  
  it('exposes errorMsg helper', () => {
    const handler = service.auth._errorMsg();
    expect(typeof handler).toBe('function');
  });
});
