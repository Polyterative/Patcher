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

describe('SupabaseService - delete complex operations', () => {
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
  
  describe('delete.module', () => {
    it('should delete comments then the module itself', (done) => {
      const tablesAccessed: string[] = [];
      
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        tablesAccessed.push(table);
        return chainable({data: [{id: 42}], error: null});
      });
      
      service.delete.module(42).subscribe({
        next: () => {
          expect(tablesAccessed).toContain('comments');
          expect(tablesAccessed).toContain('modules');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust module caches', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [{id: 1}], error: null}));
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      service.delete.module(1).subscribe({
        next: () => {
          expect(bustedKeys).toContain('modules');
          expect(bustedKeys).toContain('moduleWithId');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.patch', () => {
    it('should delete module instances, patch, and comments in sequence', (done) => {
      const tablesAccessed: string[] = [];
      
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        tablesAccessed.push(table);
        return chainable({data: null, error: null});
      });
      
      service.delete.patch(5).subscribe({
        next: () => {
          expect(tablesAccessed).toContain('patch_module_instances');
          expect(tablesAccessed).toContain('patches');
          expect(tablesAccessed).toContain('comments');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust patches cache', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      service.delete.patch(5).subscribe({
        next: () => {
          expect(bustedKeys).toContain('patches');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.userPatch', () => {
    it('should delete instances, patch (scoped to user), and comments', (done) => {
      const mockUser = {id: 'owner-1'};
      spyOn(service as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const tablesAccessed: string[] = [];
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        tablesAccessed.push(table);
        return chainable({data: null, error: null});
      });
      
      service.delete.userPatch(3).subscribe({
        next: () => {
          expect(tablesAccessed).toContain('patch_module_instances');
          expect(tablesAccessed).toContain('patches');
          expect(tablesAccessed).toContain('comments');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should scope the patch delete to the current user', (done) => {
      const mockUser = {id: 'owner-2'};
      spyOn(service as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const patchMock = chainable({data: null, error: null});
      const filterSpy = spyOn(patchMock, 'filter').and.returnValue(patchMock);
      
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'patches') return patchMock;
        return chainable({data: null, error: null});
      });
      
      service.delete.userPatch(3).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('authorid', 'eq', 'owner-2');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.userRack', () => {
    it('should delete the rack scoped to the current user', (done) => {
      const mockUser = {id: 'rack-owner'};
      spyOn(service as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const mock = chainable({data: null, error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.delete.userRack(9).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('authorid', 'eq', 'rack-owner');
          expect(filterSpy).toHaveBeenCalledWith('id', 'eq', 9);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust rackWithId cache', (done) => {
      const mockUser = {id: 'rack-owner'};
      spyOn(service as any, 'getUserSession$').and.returnValue(of(mockUser));
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
      
      service.delete.userRack(9).subscribe({
        next: () => {
          expect(bustedKeys).toContain('rackWithId');
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