import { of } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
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


function chainable(resolveValue: any = {data: null, error: null}) {
  const m: any = {};
  ['select', 'filter', 'eq', 'neq', 'is', 'in', 'range', 'order', 'limit', 'single', 'maybeSingle', 'insert', 'update', 'delete', 'upsert', 'ilike']
    .forEach(method => {
      m[method] = () => m;
    });
  m.then = (res: Function, rej?: Function) =>
    Promise.resolve(resolveValue).then(res as any, rej as any);
  return m;
}

describe('SupabaseService - Remaining Branches', () => {
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
  
  it('get.patchesWithModule resolves patch details and handles empty patch lists', (done) => {
    spyOn(supabaseClient, 'rpc').and.returnValues(
      Promise.resolve({data: [{id: 7, name: 'Patch7'}], error: null}),
      Promise.resolve({data: [], error: null})
    );
    
    service.get.patchesWithModule(1).subscribe({
      next: (result: any[]) => {
        expect(result[0].id).toBe(7);

        service.get.patchesWithModule(1).subscribe({
          next: (emptyResult: any[]) => {
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
      next: (summary: any) => {
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
    
    service.add.moduleOUTs([{id: 1, name: 'OutA'} as any], 42).subscribe({
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
    
    service.GET.modules(0, 10, undefined, undefined, undefined, undefined, 8, 'invalid' as any).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('hp', 'eq', 8);
        done();
      },
      error: done.fail
    });
  }, TEST_TIMEOUT);
  
  it('GET.currentUserModules includes manualURL when includeManuals=true', (done) => {
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'} as any));
    const query = chainable({data: [{module: {id: 1}}], error: null});
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
    spyOn(supabaseClient.auth, 'getSession').and.returnValue(
      Promise.resolve({
        data: {session: {user: {id: 'oauth-user', email: 'newuser@example.com', created_at: '2026-01-01T00:00:00Z'}}},
        error: null
      })
    );
    spyOn(service.auth as any, 'getRichUserSession$').and.returnValue(of(null));

    const profileQuery = chainable({data: {}, error: null});
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
    const rich = {
      id: 'oauth-u2',
      email: 'hasname@example.com',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      username: 'hasname'
    } as any;
    spyOn(supabaseClient.auth, 'getSession').and.returnValue(
      Promise.resolve({
        data: {session: {user: {id: 'oauth-u2', email: 'hasname@example.com', created_at: '2026-01-01T00:00:00Z'}}},
        error: null
      })
    );
    spyOn(service.auth as any, 'getRichUserSession$').and.returnValue(of(rich));
    
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
      next: (result: any) => {
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
    (service as any).authStateSubscription = {unsubscribe};
    
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
    const connection = {
      patch: {id: 999},
      a: {id: 10},
      b: {id: 20},
      notes: 'n',
      instance_id_a: 1,
      instance_id_b: 2
    } as any;
    
    buildPatchConnectionInserter(supabaseClient, [connection], (id) => service.delete.patchConnectionsForPatch(id)).subscribe({
      next: () => {
        buildPatchConnectionInserter(supabaseClient, [], (id) => service.delete.patchConnectionsForPatch(id)).subscribe({
          next: () => {
            const mapper = getCvMapper(77);
            expect(mapper({id: 1} as any).moduleid).toBe(77);
            
            const inserters = buildCVInserter(
              supabaseClient,
              [{id: 0, name: 'A'}, {id: 2, name: 'B'}] as any,
              'module_outs',
              77,
              'author-1'
            );
            const updaters = buildCVUpdater(
              supabaseClient,
              [{id: 0, name: 'A'}, {id: 2, name: 'B'}] as any,
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
        expect(resetErr.message).toContain('Failed to send password reset email');

        const uniqueQuery = chainable({data: null, error: {code: '23505', message: 'unique violation'}});
        spyOn(supabaseClient, 'from').and.returnValue(uniqueQuery);
        service.auth.updateUsername$('uid-1', 'valid_name').subscribe({
          next: () => done.fail('expected error'),
          error: (err1: Error) => {
            expect(err1.message).toContain('already taken');
            
            const genericQuery = chainable({data: null, error: {code: '500', message: 'db failure'}});
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
    const handler = (service.auth as any)._errorMsg();
    expect(typeof handler).toBe('function');
  });
});
