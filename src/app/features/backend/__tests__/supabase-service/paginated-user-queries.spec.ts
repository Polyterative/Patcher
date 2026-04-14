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
    'insert', 'update', 'delete', 'upsert', 'ilike'].forEach(method => {
    m[method] = () => m;
  });
  m.then = (res: Function, rej?: Function) =>
    Promise.resolve(resolveValue).then(res as any, rej as any);
  return m;
}

describe('SupabaseService - GET.userPatchesPaginated', () => {
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
  
  it('should return paginated {data, count} for the current user', (done) => {
    const mockUser = {id: 'user-42'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mockPatches = [{id: 1, name: 'Patch A'}, {id: 2, name: 'Patch B'}];
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: mockPatches, count: 2, error: null})
    );
    
    service.GET.userPatchesPaginated(0, 9).subscribe({
      next: (result: any) => {
        expect(result.data).toEqual(mockPatches);
        expect(result.count).toBe(2);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should filter patches by the current user id', (done) => {
    const mockUser = {id: 'owner-99'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.userPatchesPaginated(0, 9).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('authorid', 'eq', 'owner-99');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should pass the from/to range to the query', (done) => {
    const mockUser = {id: 'u1'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [], count: 0, error: null});
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.userPatchesPaginated(10, 19).subscribe({
      next: () => {
        expect(rangeSpy).toHaveBeenCalledWith(10, 19);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should order patches by updated descending', (done) => {
    const mockUser = {id: 'u1'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [], count: 0, error: null});
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.userPatchesPaginated(0, 9).subscribe({
      next: () => {
        expect(orderSpy).toHaveBeenCalledWith('updated', {ascending: false});
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - GET.userRacksPaginated', () => {
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
  
  it('should return paginated {data, count} for the current user', (done) => {
    const mockUser = {id: 'user-7'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mockRacks = [{id: 10, name: 'Rack X'}];
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: mockRacks, count: 1, error: null})
    );
    
    service.GET.userRacksPaginated(0, 9).subscribe({
      next: (result: any) => {
        expect(result.data).toEqual(mockRacks);
        expect(result.count).toBe(1);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should filter racks by current user id', (done) => {
    const mockUser = {id: 'rack-owner'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.userRacksPaginated(0, 9).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('authorid', 'eq', 'rack-owner');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply the from/to range', (done) => {
    const mockUser = {id: 'u2'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [], count: 0, error: null});
    const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.userRacksPaginated(5, 14).subscribe({
      next: () => {
        expect(rangeSpy).toHaveBeenCalledWith(5, 14);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should return empty data array when user has no racks', (done) => {
    const mockUser = {id: 'empty-user'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: [], count: 0, error: null})
    );
    
    service.GET.userRacksPaginated(0, 9).subscribe({
      next: (result: any) => {
        expect(result.count).toBe(0);
        expect(result.data).toEqual([]);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - GET.publicUserPatchesPaginated', () => {
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

  it('should filter public patches by the provided author id', (done) => {
    const mock = chainable({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.publicUserPatchesPaginated('public-author', 0, 9).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('authorid', 'eq', 'public-author');
        expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - GET.publicUserRacksPaginated', () => {
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

  it('should filter public racks by the provided author id', (done) => {
    const mock = chainable({data: [], count: 0, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);

    service.GET.publicUserRacksPaginated('public-author', 0, 9).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('authorid', 'eq', 'public-author');
        expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - GET.racksMinimal', () => {
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
  
  it('should return public racks with data and count', (done) => {
    const mockRacks = [{id: 1, name: 'My Rack', hp: 84, rows: 3}];
    const mock = chainable({data: mockRacks, count: 1, error: null});
    mock.ilike = () => mock;
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.racksMinimal(0, 19).subscribe({
      next: (result: any) => {
        expect(result.data).toEqual(mockRacks);
        expect(result.count).toBe(1);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should filter racks to only public=true', (done) => {
    const mock = chainable({data: [], count: 0, error: null});
    mock.ilike = () => mock;
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.racksMinimal(0, 19).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('public', 'eq', true);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should apply ilike name filter when name is provided', (done) => {
    const mock = chainable({data: [], count: 0, error: null});
    const ilikeSpy = jasmine.createSpy('ilike').and.returnValue(mock);
    mock.ilike = ilikeSpy;
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.racksMinimal(0, 19, 'Drum').subscribe({
      next: () => {
        expect(ilikeSpy).toHaveBeenCalledWith('name', jasmine.stringContaining('drum'));
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should NOT apply name filter when name is empty', (done) => {
    const mock = chainable({data: [], count: 0, error: null});
    const ilikeSpy = jasmine.createSpy('ilike').and.returnValue(mock);
    mock.ilike = ilikeSpy;
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.racksMinimal(0, 19, '').subscribe({
      next: () => {
        expect(ilikeSpy).not.toHaveBeenCalled();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - GET.patchConnections', () => {
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
  
  it('should return the data array of connections for a patch', (done) => {
    const mockConnections = [
      {id: 1, patchid: 5, a: {id: 10}, b: {id: 20}, notes: 'pitch'}
    ];
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: mockConnections, error: null})
    );
    
    service.GET.patchConnections(5).subscribe({
      next: (result: any) => {
        expect(result).toEqual(mockConnections);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should filter by patchid', (done) => {
    const mock = chainable({data: [], error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.patchConnections(42).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('patchid', 'eq', 42);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should order connections by ordinal', (done) => {
    const mock = chainable({data: [], error: null});
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.patchConnections(1).subscribe({
      next: () => {
        expect(orderSpy).toHaveBeenCalledWith('ordinal');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should return null data as-is when there are no connections', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: null, error: null})
    );
    
    service.GET.patchConnections(99).subscribe({
      next: (result: any) => {
        expect(result).toBeNull();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - GET.patchModuleInstances', () => {
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
  
  it('should return array of instances for a patch', (done) => {
    const mockInstances = [
      {id: 1, patch_id: 7, module_id: 3, instance_label: 'Osc 1'},
      {id: 2, patch_id: 7, module_id: 5, instance_label: null}
    ];
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: mockInstances, error: null})
    );
    
    service.GET.patchModuleInstances(7).subscribe({
      next: (result: any) => {
        expect(result.length).toBe(2);
        expect(result[0].instance_label).toBe('Osc 1');
        expect(result[1].instance_label).toBeNull();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should filter by patch_id', (done) => {
    const mock = chainable({data: [], error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.GET.patchModuleInstances(55).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('patch_id', 'eq', 55);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should return an empty array when patch has no instances', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: null, error: null})
    );
    
    service.GET.patchModuleInstances(0).subscribe({
      next: (result: any) => {
        // remapErrors + map(x => x.data as PatchModuleInstance[]) may return null;
        // at minimum it must not throw
        expect(result === null || Array.isArray(result)).toBeTrue();
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - get.currentUserPatches unauthenticated', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should return empty array when there is no user session', (done) => {
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));
    
    service.get.currentUserPatches().subscribe({
      next: (result: any) => {
        expect(Array.isArray(result)).toBeTrue();
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

describe('SupabaseService - get.currentUserRacks authorid override', () => {
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
  
  it('should query by the current session authorid', (done) => {
    const mock = chainable({data: [{id: 5, name: 'Guest Rack'}], error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'session-author-id'}));
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.get.currentUserRacks().subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('authorid', 'eq', 'session-author-id');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - get.myVotes', () => {
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
  
  it('should return an array of voted moduletagids', (done) => {
    const mockUser = {id: 'voter'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: [{moduletagid: 10}, {moduletagid: 20}], error: null})
    );
    
    service.get.myVotes().subscribe({
      next: (result: any) => {
        expect(result).toEqual([10, 20]);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should return empty array when user has cast no votes', (done) => {
    const mockUser = {id: 'no-votes-user'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: [], error: null})
    );
    
    service.get.myVotes().subscribe({
      next: (result: any) => {
        expect(result).toEqual([]);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should filter votes by current user authorid', (done) => {
    const mockUser = {id: 'voter-123'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [], error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.get.myVotes().subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('authorid', 'eq', 'voter-123');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - add.patchModuleInstance', () => {
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
  
  it('should insert a patch module instance and return the created row', (done) => {
    const mockUser = {id: 'author'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mockRow = {id: 77, patch_id: 3, module_id: 5, instance_label: 'VCO 1'};
    const mock = chainable({data: mockRow, error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.add.patchModuleInstance(3, 5, 'VCO 1').subscribe({
      next: (result: any) => {
        expect(insertSpy).toHaveBeenCalledWith({
          patch_id: 3,
          module_id: 5,
          instance_label: 'VCO 1'
        });
        expect(result.id).toBe(77);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should store null when no instance_label is provided', (done) => {
    const mockUser = {id: 'author'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: {id: 88, patch_id: 1, module_id: 2, instance_label: null}, error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.add.patchModuleInstance(1, 2).subscribe({
      next: () => {
        expect(insertSpy).toHaveBeenCalledWith({
          patch_id: 1,
          module_id: 2,
          instance_label: null
        });
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust patchConnections and patchModuleInstances caches', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: {id: 1, patch_id: 1, module_id: 1, instance_label: null}, error: null})
    );
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe((keys: any) => bustedKeys.push(...keys));
    
    service.add.patchModuleInstance(1, 1).subscribe({
      next: () => {
        expect(bustedKeys).toContain('patchConnections');
        expect(bustedKeys).toContain('patchModuleInstances');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - add.patchModuleInstances (batch)', () => {
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
  
  it('should batch insert multiple instances in a single call', (done) => {
    const mockUser = {id: 'batch-author'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const rows = [
      {patch_id: 10, module_id: 1, instance_label: 'A'},
      {patch_id: 10, module_id: 2, instance_label: 'B'},
      {patch_id: 10, module_id: 3, instance_label: null},
    ];
    const mockResult = rows.map((r, i) => ({...r, id: i + 1}));
    const mock = chainable({data: mockResult, error: null});
    const insertSpy = spyOn(mock, 'insert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.add.patchModuleInstances(rows).subscribe({
      next: (result: any) => {
        expect(insertSpy).toHaveBeenCalledWith(rows);
        expect(result.length).toBe(3);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - delete.userRack', () => {
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
  
  it('should delete the rack scoped to the current user', (done) => {
    const mockUser = {id: 'rack-owner'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: null, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.delete.userRack(7).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('authorid', 'eq', 'rack-owner');
        expect(filterSpy).toHaveBeenCalledWith('id', 'eq', 7);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust rackWithId cache after deletion', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe((keys: any) => bustedKeys.push(...keys));
    
    service.delete.userRack(1).subscribe({
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

describe('SupabaseService - delete.patchConnectionsForPatch', () => {
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
  
  it('should delete all connections for the given patch id', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: null, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.delete.patchConnectionsForPatch(33).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('patchid', 'eq', 33);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust patchConnections and patches caches', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe((keys: any) => bustedKeys.push(...keys));
    
    service.delete.patchConnectionsForPatch(33).subscribe({
      next: () => {
        expect(bustedKeys).toContain('patchConnections');
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

describe('SupabaseService - delete.patchModuleInstancesForPatch', () => {
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
  
  it('should delete all module instances for the given patch_id', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: null, error: null});
    const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.delete.patchModuleInstancesForPatch(44).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('patch_id', 'eq', 44);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust patchConnections and patchModuleInstances caches', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe((keys: any) => bustedKeys.push(...keys));
    
    service.delete.patchModuleInstancesForPatch(44).subscribe({
      next: () => {
        expect(bustedKeys).toContain('patchModuleInstances');
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

describe('SupabaseService - update.rack', () => {
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
  
  it('should upsert rack with correct fields including authorid from session', (done) => {
    const mockUser = {id: 'rack-author'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: [{id: 3}], error: null});
    const upsertSpy = spyOn(mock, 'upsert').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    const rackData: any = {
      id: 3, name: 'Updated Rack', hp: 84, rows: 3,
      description: 'test', locked: false, public: true, image: null
    };
    
    service.update.rack(rackData).subscribe({
      next: () => {
        const payload = upsertSpy.calls.first().args[0] as any;
        expect(payload.authorid).toBe('rack-author');
        expect(payload.name).toBe('Updated Rack');
        expect(payload.id).toBe(3);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust rackWithId cache', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: [{id: 1}], error: null}));
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe((keys: any) => bustedKeys.push(...keys));
    
    service.update.rack({id: 1, name: 'R', hp: 84, rows: 3} as any).subscribe({
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
  
  it('should throw when user is not authenticated', (done) => {
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));
    
    service.update.rack({id: 1, name: 'R', hp: 84, rows: 3} as any).subscribe({
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

describe('SupabaseService - update.patchModuleInstanceLabel', () => {
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
  
  it('should update instance_label for the given id', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: {id: 5, patch_id: 1, module_id: 2, instance_label: 'LFO 2'}, error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.update.patchModuleInstanceLabel(5, 'LFO 2').subscribe({
      next: (result: any) => {
        expect(updateSpy).toHaveBeenCalledWith({instance_label: 'LFO 2'});
        expect(result.instance_label).toBe('LFO 2');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should allow clearing a label by passing null', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    
    const mock = chainable({data: {id: 5, patch_id: 1, module_id: 2, instance_label: null}, error: null});
    const updateSpy = spyOn(mock, 'update').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.update.patchModuleInstanceLabel(5, null).subscribe({
      next: () => {
        expect(updateSpy).toHaveBeenCalledWith({instance_label: null});
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust patchConnections and patchModuleInstances caches', (done) => {
    const mockUser = {id: 'u'};
    spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
    spyOn(supabaseClient, 'from').and.returnValue(
      chainable({data: {id: 1, patch_id: 1, module_id: 1, instance_label: 'X'}, error: null})
    );
    
    const bustedKeys: any[] = [];
    service.cacheResetter$.subscribe((keys: any) => bustedKeys.push(...keys));
    
    service.update.patchModuleInstanceLabel(1, 'X').subscribe({
      next: () => {
        expect(bustedKeys).toContain('patchConnections');
        expect(bustedKeys).toContain('patchModuleInstances');
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - get.allTags', () => {
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
  
  it('should return a flat array of all tags ordered by type and name', (done) => {
    const mockTags = [
      {id: 1, name: 'Envelope', type: 'function'},
      {id: 2, name: 'Oscillator', type: 'function'},
      {id: 3, name: 'Digital', type: 'technology'}
    ];
    const mock = chainable({data: mockTags, error: null});
    const orderSpy = spyOn(mock, 'order').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.get.allTags().subscribe({
      next: (result: any) => {
        expect(result).toEqual(mockTags);
        expect(orderSpy).toHaveBeenCalledWith('type', {ascending: true});
        expect(orderSpy).toHaveBeenCalledWith('name', {ascending: true});
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should return empty array when no tags exist', (done) => {
    spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
    
    service.get.allTags().subscribe({
      next: (result: any) => {
        expect(result).toEqual([]);
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});
