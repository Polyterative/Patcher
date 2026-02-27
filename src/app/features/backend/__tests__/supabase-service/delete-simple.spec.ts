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

describe('SupabaseService - delete simple operations', () => {
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
  
  describe('delete.commentsForRack', () => {
    it('should delete all comments for a rack entity', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      const mock = chainable({data: null, error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.commentsForRack(7).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('entityId', 'eq', 7);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust the comments cache', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      let busted = false;
      service.cacheResetter$.subscribe(keys => {
        if ((keys as any[]).includes('comments')) busted = true;
      });

      service.delete.commentsForRack(7).subscribe({
        next: () => {
          expect(busted).toBeTrue();
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

      service.delete.commentsForRack(7).subscribe({
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
  
  describe('delete.userModuleTag', () => {
    it('should delete tag vote for the current user', (done) => {
      const mockUser = {id: 'voter-1'};
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(mockUser));
      
      const mock = chainable({data: null, error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.delete.userModuleTag(33).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('authorid', 'eq', 'voter-1');
          expect(filterSpy).toHaveBeenCalledWith('moduletagid', 'eq', 33);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.modulesOfRack', () => {
    it('should delete all rack modules for a given rack', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      const mock = chainable({data: null, error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.modulesOfRack(5).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('rackid', 'eq', 5);
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

      service.delete.modulesOfRack(5).subscribe({
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
  
  describe('delete.patchConnectionsForPatch', () => {
    it('should delete all connections for a patch', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      const mock = chainable({data: null, error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.patchConnectionsForPatch(12).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('patchid', 'eq', 12);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust patchConnections and patches caches', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));

      service.delete.patchConnectionsForPatch(12).subscribe({
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

    it('should error when user is not authenticated', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));

      service.delete.patchConnectionsForPatch(12).subscribe({
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
  
  describe('delete.patchModuleInstance', () => {
    it('should delete a single patch module instance by id', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      const mock = chainable({data: null, error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.patchModuleInstance(8).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('id', 'eq', 8);
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

      service.delete.patchModuleInstance(8).subscribe({
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

  describe('delete.patchModuleInstancesForPatch', () => {
    it('should delete all instances for a patch', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      const mock = chainable({data: null, error: null});
      const filterSpy = spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.patchModuleInstancesForPatch(20).subscribe({
        next: () => {
          expect(filterSpy).toHaveBeenCalledWith('patch_id', 'eq', 20);
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

      service.delete.patchModuleInstancesForPatch(20).subscribe({
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
  
  describe('delete.modules (bulk)', () => {
    it('should delete a range of modules when authenticated', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      const mock = chainable({data: null, error: null});
      const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.modules(0, 10).subscribe({
        next: () => {
          expect(rangeSpy).toHaveBeenCalledWith(0, 10);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust modules caches', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      spyOn(supabaseClient, 'from').and.returnValue(chainable({data: null, error: null}));
      const bustedKeys: any[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as any[])));

      service.delete.modules().subscribe({
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

    it('should error when user is not authenticated', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of(null));

      service.delete.modules().subscribe({
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

  describe('delete.manufacturers (bulk)', () => {
    it('should delete manufacturers in a range when authenticated', (done) => {
      spyOn(service.auth as any, 'getUserSession$').and.returnValue(of({id: 'u1'}));
      const mock = chainable({data: null, error: null});
      const rangeSpy = spyOn(mock, 'range').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.manufacturers(0, 5).subscribe({
        next: () => {
          expect(rangeSpy).toHaveBeenCalledWith(0, 5);
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

      service.delete.manufacturers(0, 5).subscribe({
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
});