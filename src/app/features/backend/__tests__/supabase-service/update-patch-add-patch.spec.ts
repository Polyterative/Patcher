import { SupabaseService } from '../../supabase.service';
import { createUpdateNamespace } from '../../supabase-update';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { of } from 'rxjs';
import {
  authUserFixture,
  chainable
} from './supabase-query-test-doubles';
import type { CachedEntity } from '../../supabase.cache';
import type { Patch } from 'src/app/models/patch';
import type { DbModule } from 'src/app/models/module';

describe('SupabaseService - update.patch', () => {
  let service: SupabaseService;
  let supabaseClient: {from: (table: string) => unknown};
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as unknown as {supabase: {from: (table: string) => unknown}}).supabase;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should update the patch and strip the author field', (done) => {
    const mockUser = authUserFixture('patch-user');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));

    const mock = chainable({data: {id: 10, name: 'Test'}, error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.update.patch({id: 10, name: 'Test', author: {id: 'a', username: 'usr'}} as unknown as Patch).subscribe({
      next: () => {
        const payload = updateSpy.calls.first().args[0] as unknown as Record<string, unknown>;
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
    const mockUser = authUserFixture('patch-user');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));

    const mock = chainable({data: {id: 10, linked_rack_id: 42}, error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.update.patch({
      id: 10,
      name: 'Linked Patch',
      linked_rack_id: 42,
      author: {id: 'a', username: 'usr'}
    } as unknown as Patch).subscribe({
      next: () => {
        const payload = updateSpy.calls.first().args[0] as unknown as Record<string, unknown>;
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
    const mockUser = authUserFixture('patch-user');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: {id: 1}, error: null}));
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
    
    service.update.patch({id: 1, name: 'P'} as unknown as Patch).subscribe({
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
  let supabaseClient: {from: (table: string) => unknown};
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as unknown as {supabase: {from: (table: string) => unknown}}).supabase;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should update the patch without showing a toast', (done) => {
    const mockUser = authUserFixture('silent-user');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));

    const mock = chainable({data: {id: 5, name: 'Silent'}, error: null});
    spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.update.patchSilent({id: 5, name: 'Silent', author: {id: 'x'}} as unknown as Patch).subscribe({
      next: (result) => {
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
    const mockUser = authUserFixture('silent-user');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: {id: 2}, error: null}));
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
    
    service.update.patchSilent({id: 2, name: 'Q'} as unknown as Patch).subscribe({
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

  it('should surface Supabase response errors when patchSilent fails', (done) => {
    const mockUser = authUserFixture('silent-user');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({
      data: null,
      error: {details: null, hint: null, name: 'PostgrestError',
        code: 'PGRST204',
        message: "Column 'linked_rack_id' of relation 'patches' does not exist"
      }
    }));
    
    service.update.patchSilent({id: 2, name: 'Q'} as unknown as Patch).subscribe({
      next: () => {
        fail('should have errored');
        done();
      },
      error: (err) => {
        expect(err.code).toBe('PGRST204');
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - update.patchPreviewImage', () => {
  let service: SupabaseService;
  let supabaseClient: { from: (table: string) => unknown };

  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as unknown as { supabase: { from: (table: string) => unknown } }).supabase;
  });

  afterEach(() => {
    cleanupSupabaseServiceTest();
  });

  it('updates only the image column and selects explicit columns', (done) => {
    spyOn(service.auth, 'getUserSession$').and.returnValue(of({
      id: 'patch-user',
      email: 'patch@example.com',
      created_at: '',
      updated_at: ''
    }));
    const mock = chainable({
      data: {id: 10, image: 'patch_10_v20260618t201530123z.svg', updated: '2026-06-18T20:15:30.123Z'},
      error: null
    });
    const updateSpy = spyOn(mock, 'update').and.callThrough();
    const eqSpy = spyOn(mock, 'eq').and.callThrough();
    const selectSpy = spyOn(mock, 'select').and.callThrough();
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.update.patchPreviewImage(10, 'patch_10_v20260618t201530123z.svg').subscribe({
      next: () => {
        expect(supabaseClient.from).toHaveBeenCalledWith('patches');
        expect(updateSpy).toHaveBeenCalledOnceWith({image: 'patch_10_v20260618t201530123z.svg'});
        expect(eqSpy.calls.allArgs()).toEqual([
          ['id', 10]
        ]);
        expect(selectSpy).toHaveBeenCalledOnceWith('id,image,updated');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('filters by current user for non-admin calls', (done) => {
    const mock = chainable({
      data: {id: 10, image: 'patch_10_v20260618t201530123z.svg', updated: '2026-06-18T20:15:30.123Z'},
      error: null
    });
    const eqSpy = spyOn(mock, 'eq').and.callThrough();
    const supabase = {from: jasmine.createSpy('from').and.returnValue(mock)};
    const update = createUpdateNamespace(
      supabase as unknown as Parameters<typeof createUpdateNamespace>[0],
      {} as Parameters<typeof createUpdateNamespace>[1],
      () => of({
        id: 'patch-user',
        email: 'patch@example.com',
        created_at: '',
        updated_at: ''
      }),
      () => of([]),
      () => of(false)
    );

    update.patchPreviewImage(10, 'patch_10_v20260618t201530123z.svg').subscribe({
      next: () => {
        expect(eqSpy.calls.allArgs()).toEqual([
          ['id', 10],
          ['authorid', 'patch-user']
        ]);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('allows clearing the image and busts patch list/detail caches', (done) => {
    spyOn(service.auth, 'getUserSession$').and.returnValue(of({
      id: 'patch-user',
      email: 'patch@example.com',
      created_at: '',
      updated_at: ''
    }));
    const mock = chainable({data: {id: 10, image: null}, error: null});
    const updateSpy = spyOn(mock, 'update').and.callThrough();
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    const bustedKeys: string[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as string[])));

    service.update.patchPreviewImage(10, null).subscribe({
      next: () => {
        expect(updateSpy).toHaveBeenCalledOnceWith({image: null});
        expect(bustedKeys).toContain('patches');
        expect(bustedKeys).toContain('patchesWithModule');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('requires authentication', (done) => {
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(null));

    service.update.patchPreviewImage(10, 'patch_10_v20260618t201530123z.svg').subscribe({
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

describe('SupabaseService - add.patch', () => {
  let service: SupabaseService;
  let supabaseClient: {from: (table: string) => unknown};
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as unknown as {supabase: {from: (table: string) => unknown}}).supabase;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should insert a new patch with authorid from session', (done) => {
    const mockUser = authUserFixture('patch-author');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [{id: 77}], error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.add.patch({name: 'Generative Patch', public: false}).subscribe({
      next: () => {
        const payload = insertSpy.calls.first().args[0] as unknown as Record<string, unknown>;
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
    const mockUser = authUserFixture('patch-author');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));

    const mock = chainable({data: [{id: 77}], error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.add.patch({name: 'Linked Patch', linked_rack_id: 19}).subscribe({
      next: () => {
        const payload = insertSpy.calls.first().args[0] as unknown as Record<string, unknown>;
        expect(payload.linked_rack_id).toBe(19);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should omit linked_rack_id when no linked rack was selected', (done) => {
    const mockUser = authUserFixture('patch-author');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));

    const mock = chainable({data: [{id: 78}], error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.add.patch({name: 'Unlinked Patch'}).subscribe({
      next: () => {
        const payload = insertSpy.calls.first().args[0] as unknown as Record<string, unknown>;
        expect(payload.name).toBe('Unlinked Patch');
        expect(payload.authorid).toBe('patch-author');
        expect(payload.public).toBeTrue();
        expect(Object.prototype.hasOwnProperty.call(payload, 'linked_rack_id')).toBeFalse();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should throw when user is not authenticated', (done) => {
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(null));
    
    service.add.patch({name: 'Anon Patch'}).subscribe({
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
    const mockUser = authUserFixture('u');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [{id: 1}], error: null}));
    
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
    
    service.add.patch({name: 'P', public: true}).subscribe({
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

  it('should surface Supabase response errors when patch insert fails', (done) => {
    const mockUser = authUserFixture('patch-author');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({
      data: null,
      error: {details: null, hint: null, name: 'PostgrestError',
        code: 'PGRST204',
        message: "Column 'linked_rack_id' of relation 'patches' does not exist"
      }
    }));
    
    service.add.patch({name: 'Linked Patch', linked_rack_id: 19}).subscribe({
      next: () => {
        fail('should have errored');
        done();
      },
      error: (err) => {
        expect(err.code).toBe('PGRST204');
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - add.modules', () => {
  let service: SupabaseService;
  let supabaseClient: {from: (table: string) => unknown};
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = (service as unknown as {supabase: {from: (table: string) => unknown}}).supabase;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should insert modules with the provided data', (done) => {
    const mockUser = authUserFixture('module-author');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [{id: 20}], error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.add.modules([{name: 'New VCO', hp: 4, manufacturerId: 2} as unknown as DbModule]).subscribe({
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
    const mockUser = authUserFixture('u');
    spyOn(service.auth, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [{id: 1}], error: null}));
    
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
    
    service.add.modules([{name: 'M', hp: 4, manufacturerId: 1} as unknown as DbModule]).subscribe({
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
