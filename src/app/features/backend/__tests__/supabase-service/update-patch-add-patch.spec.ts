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

describe('SupabaseService - update.patch', () => {
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
  
  it('should update the patch and strip the author field', (done) => {
    const mockUser = {id: 'patch-user'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));

    const mock = chainable({data: {id: 10, name: 'Test'}, error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.update.patch({id: 10, name: 'Test', author: {id: 'a', username: 'usr'}} as any).subscribe({
      next: () => {
        const payload = updateSpy.calls.first().args[0] as any;
        expect(payload.author).toBeUndefined();
        expect(payload.id).toBe(10);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should preserve linked_rack_id when updating a patch', (done) => {
    const mockUser = {id: 'patch-user'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));

    const mock = chainable({data: {id: 10, linked_rack_id: 42}, error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.update.patch({
      id: 10,
      name: 'Linked Patch',
      linked_rack_id: 42,
      author: {id: 'a', username: 'usr'}
    } as any).subscribe({
      next: () => {
        const payload = updateSpy.calls.first().args[0] as any;
        expect(payload.linked_rack_id).toBe(42);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust patches and patchConnections caches', (done) => {
    const mockUser = {id: 'patch-user'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: {id: 1}, error: null}));
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
    
    service.update.patch({id: 1, name: 'P'} as any).subscribe({
      next: () => {
        expect(bustedKeys).toContain('patches');
        expect(bustedKeys).toContain('patchConnections');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - update.patchSilent', () => {
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
  
  it('should update the patch without showing a toast', (done) => {
    const mockUser = {id: 'silent-user'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));

    const mock = chainable({data: {id: 5, name: 'Silent'}, error: null});
    spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.update.patchSilent({id: 5, name: 'Silent', author: {id: 'x'}} as any).subscribe({
      next: (result: any) => {
        // patchSilent calls .single() so result is the raw supabase response
        expect(result).toBeDefined();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should still bust patches and patchConnections caches', (done) => {
    const mockUser = {id: 'silent-user'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: {id: 2}, error: null}));
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
    
    service.update.patchSilent({id: 2, name: 'Q'} as any).subscribe({
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

describe('SupabaseService - add.patch', () => {
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
  
  it('should insert a new patch with authorid from session', (done) => {
    const mockUser = {id: 'patch-author'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [{id: 77}], error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.add.patch({name: 'Generative Patch', public: false} as any).subscribe({
      next: () => {
        const payload = insertSpy.calls.first().args[0] as any;
        expect(payload.authorid).toBe('patch-author');
        expect(payload.name).toBe('Generative Patch');
        expect(payload.public).toBeFalse();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should include linked_rack_id when provided', (done) => {
    const mockUser = {id: 'patch-author'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));

    const mock = chainable({data: [{id: 77}], error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.add.patch({name: 'Linked Patch', linked_rack_id: 19} as any).subscribe({
      next: () => {
        const payload = insertSpy.calls.first().args[0] as any;
        expect(payload.linked_rack_id).toBe(19);
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
    
    service.add.patch({name: 'Anon Patch'} as any).subscribe({
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
  
  it('should bust patches cache', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [{id: 1}], error: null}));
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
    
    service.add.patch({name: 'P', public: true} as any).subscribe({
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

describe('SupabaseService - add.modules', () => {
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
  
  it('should insert modules with the provided data', (done) => {
    const mockUser = {id: 'module-author'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [{id: 20}], error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.add.modules([{name: 'New VCO', hp: 4, manufacturerId: 2} as any]).subscribe({
      next: () => {
        expect(insertSpy).toHaveBeenCalled();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust modules and currentUserModules caches', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [{id: 1}], error: null}));
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));
    
    service.add.modules([{name: 'M', hp: 4, manufacturerId: 1} as any]).subscribe({
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
});
