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
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        tablesAccessed.push(table);
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
  });
});