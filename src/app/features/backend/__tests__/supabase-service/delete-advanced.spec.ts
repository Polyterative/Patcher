import { of } from 'rxjs';
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

describe('SupabaseService - delete advanced', () => {
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
  
  describe('delete.modulePanel', () => {
    it('should call storage.deletePanelFile then delete the DB row', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      const mockBucket = {
        remove: jasmine.createSpy('remove').and.returnValue(Promise.resolve({data: [], error: null}))
      };
      spyOn(supabaseClient.storage, 'from').and.returnValue(mockBucket);

      const mock = chainable({data: null, error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      const panelData = {id: 10, filename: 'mypanel.jpg', moduleid: 1, color: 0, description: ''} as any;
      service.delete.modulePanel(panelData).subscribe({
        next: () => {
          expect(mockBucket.remove).toHaveBeenCalledWith(['mypanel.jpg']);
          expect(filterSpy).toHaveBeenCalledWith('id', 'eq', 10);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should access module_panels table in the DB step', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      const mockBucket = {
        remove: jasmine.createSpy('remove').and.returnValue(Promise.resolve({data: [], error: null}))
      };
      spyOn(supabaseClient.storage, 'from').and.returnValue(mockBucket);

      const tablesAccessed: string[] = [];
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        tablesAccessed.push(table);
        return chainable({data: null, error: null});
      });

      service.delete.modulePanel({id: 5, filename: 'panel.jpg'} as any).subscribe({
        next: () => {
          expect(tablesAccessed).toContain('module_panels');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));

      service.delete.modulePanel({id: 5, filename: 'panel.jpg'} as any).subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.allUserData', () => {
    it('should complete the full sequential delete chain', (done) => {
      const mockUser = {id: 'delete-me-user'};
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const fromSpy = spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      
      service.delete.allUserData().subscribe({
        next: () => {
          expect(fromSpy).toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should access all required tables', (done) => {
      const mockUser = {id: 'delete-user-42'};
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const tablesAccessed: string[] = [];
      let patchCalls = 0;
      let rackCalls = 0;
      let commentCalls = 0;
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        tablesAccessed.push(table);
        if (table === 'patches') {
          patchCalls++;
          return chainable({data: patchCalls === 1 ? [{id: 1}] : null, error: null});
        }
        if (table === 'racks') {
          rackCalls++;
          return chainable({data: rackCalls === 1 ? [{id: 2}] : null, error: null});
        }
        if (table === 'comments') {
          commentCalls++;
          return chainable({data: null, error: null});
        }
        return chainable({data: null, error: null});
      });
      
      service.delete.allUserData().subscribe({
        next: () => {
          expect(tablesAccessed).toContain('patch_connections');
          expect(tablesAccessed).toContain('patch_module_instances');
          expect(tablesAccessed).toContain('patches');
          expect(tablesAccessed).toContain('rack_modules');
          expect(tablesAccessed).toContain('racks');
          expect(tablesAccessed).toContain('user_modules');
          expect(tablesAccessed).toContain('comments');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust all major caches', (done) => {
      const mockUser = {id: 'cache-bust-user'};
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      service.delete.allUserData().subscribe({
        next: () => {
          expect(bustedKeys).toContain('patches');
          expect(bustedKeys).toContain('comments');
          expect(bustedKeys).toContain('rackWithId');
          expect(bustedKeys).toContain('modules');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should resolve owned ids before using .in filters', (done) => {
      const mockUser = {id: 'delete-user-ids'};
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));

      const inCalls: Array<{
        table: string;
        column: string;
        ids: number[];
      }> = [];
      const buildDeleteMock = (table: string) => {
        const mock = chainable({data: null, error: null});
        spyOn(mock, 'in').and.callFake((column: string, ids: number[]) => {
          inCalls.push({table, column, ids: [...ids]});
          return mock;
        });
        return mock;
      };

      const patchSelect = chainable({data: [{id: 11}, {id: 12}], error: null});
      const patchConnectionsDelete = buildDeleteMock('patch_connections');
      const patchModuleInstancesDelete = buildDeleteMock('patch_module_instances');
      const patchDelete = buildDeleteMock('patches');
      const rackSelect = chainable({data: [{id: 21}], error: null});
      const rackModulesDelete = buildDeleteMock('rack_modules');
      const rackDelete = buildDeleteMock('racks');
      const userModulesDelete = chainable({data: null, error: null});
      const patchCommentsDelete = buildDeleteMock('comments');
      const rackCommentsDelete = buildDeleteMock('comments');
      const authorCommentsDelete = chainable({data: null, error: null});

      let patchCalls = 0;
      let rackCalls = 0;
      let commentCalls = 0;

      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'patches') {
          patchCalls++;
          return patchCalls === 1 ? patchSelect : patchDelete;
        }
        if (table === 'patch_connections') return patchConnectionsDelete;
        if (table === 'patch_module_instances') return patchModuleInstancesDelete;
        if (table === 'racks') {
          rackCalls++;
          return rackCalls === 1 ? rackSelect : rackDelete;
        }
        if (table === 'rack_modules') return rackModulesDelete;
        if (table === 'user_modules') return userModulesDelete;
        if (table === 'comments') {
          commentCalls++;
          if (commentCalls === 1) return patchCommentsDelete;
          if (commentCalls === 2) return rackCommentsDelete;
          return authorCommentsDelete;
        }
        fail(`Unexpected table access: ${ table }`);
        return chainable({data: null, error: null});
      });

      service.delete.allUserData().subscribe({
        next: () => {
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'patch_connections',
            column: 'patchid',
            ids: [11, 12]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'patch_module_instances',
            column: 'patch_id',
            ids: [11, 12]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'patches',
            column: 'id',
            ids: [11, 12]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'rack_modules',
            column: 'rackid',
            ids: [21]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'racks',
            column: 'id',
            ids: [21]
          }));
          expect(inCalls).toContain(jasmine.objectContaining({
            table: 'comments',
            column: 'entityId',
            ids: [11, 12]
          }));
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
