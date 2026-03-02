import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { of } from 'rxjs';


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

describe('SupabaseService - delete.userModule', () => {
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
  
  it('should delete the user_modules row by profileid and moduleid', (done) => {
    const mockUser = {id: 'user-xyz'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: null, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.delete.userModule(55).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('profileid', 'eq', 'user-xyz');
        expect(filterSpy).toHaveBeenCalledWith('moduleid', 'eq', 55);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust currentUserModules and currentUserComments caches', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
    
    service.delete.userModule(1).subscribe({
      next: () => {
        expect(bustedKeys).toContain('currentUserModules');
        expect(bustedKeys).toContain('currentUserComments');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should also delete associated comments for the module', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const tablesAccessed: string[] = [];
    spyOn(supabaseClient, 'from').and.callFake((table: string) => {
      tablesAccessed.push(table);
      return chainable({data: null, error: null});
    });
    
    service.delete.userModule(10).subscribe({
      next: () => {
        expect(tablesAccessed).toContain('comments');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - delete.modules (range)', () => {
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
  
  it('should delete modules in the specified range', (done) => {
    const mockUser = {id: 'admin'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: null, error: null});
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.delete.modules(0, 9).subscribe({
      next: () => {
        expect(rangeSpy).toHaveBeenCalledWith(0, 9);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust modules caches', (done) => {
    const mockUser = {id: 'admin'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
    
    service.delete.modules(0, 4).subscribe({
      next: () => {
        expect(bustedKeys).toContain('modules');
        expect(bustedKeys).toContain('currentUserModules');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should throw when user is not authenticated', (done) => {
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));
    
    service.delete.modules(0, 5).subscribe({
      next: () => {
        fail('should have errored');
        done();
      },
      error: (err) => {
        expect(err.message).toContain('Authentication required');
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - delete.manufacturers (range)', () => {
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
  
  it('should delete manufacturers in the specified range', (done) => {
    const mockUser = {id: 'admin'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: null, error: null});
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.delete.manufacturers(0, 4).subscribe({
      next: () => {
        expect(rangeSpy).toHaveBeenCalledWith(0, 4);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust manufacturers cache', (done) => {
    const mockUser = {id: 'admin'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
    
    service.delete.manufacturers(0, 3).subscribe({
      next: () => {
        expect(bustedKeys).toContain('manufacturers');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should throw when user is not authenticated', (done) => {
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));
    
    service.delete.manufacturers(0, 5).subscribe({
      next: () => {
        fail('should have errored');
        done();
      },
      error: (err) => {
        expect(err.message).toContain('Authentication required');
        done();
      }
    });
  }, TEST_TIMEOUT);
});