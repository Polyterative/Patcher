import { of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SupabaseService } from '../../supabase.service';
import type { CachedEntity } from '../../supabase.cache';
import { CommentableEntityTypes } from '../../supabase-comments';
import type { SupabaseTableRow } from '../../supabase-db.types';
import { DbPaths } from '../../DatabaseStrings';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  authUserFixture,
  chainable,
  getSupabaseClientDouble,
  mockUserSession,
  type QueryChainResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type CommentDeleteRow = Pick<SupabaseTableRow<'comments'>, 'entityId' | 'entityType'>;
type ManufacturerDeleteRow = Pick<SupabaseTableRow<'manufacturers'>, 'id'>;
type ModuleDeleteRow = Pick<SupabaseTableRow<'modules'>, 'id'>;
type PatchConnectionDeleteRow = Pick<SupabaseTableRow<'patch_connections'>, 'patchid'>;
type PatchModuleInstanceDeleteRow = Pick<SupabaseTableRow<'patch_module_instances'>, 'id' | 'patch_id'>;
type RackModuleDeleteRow = Pick<SupabaseTableRow<'rack_modules'>, 'rackid'>;
type UserModuleTagDeleteRow = Pick<SupabaseTableRow<'user_module_tags'>, 'authorid' | 'moduletagid'>;
type DeleteFilterValue = Parameters<SupabaseQueryChain<unknown>['filter']>[2];
type DeleteFilterCall = {
  column: string;
  operator: string;
  value: DeleteFilterValue;
};

const successfulDelete = {data: null, error: null} satisfies QueryChainResult<never>;

function trackFilters<Row>(mock: SupabaseQueryChain<Row>): DeleteFilterCall[] {
  const filters: DeleteFilterCall[] = [];
  spyOn(mock, 'filter').and.callFake((column: string, operator: string, value: DeleteFilterValue) => {
    filters.push({column, operator, value});
    return mock;
  });
  return filters;
}

describe('SupabaseService - delete simple operations', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;
  let originalProduction: boolean;
  
  beforeEach(() => {
    originalProduction = environment.production;
    environment.production = true;
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
  });
  
  afterEach(() => {
    environment.production = originalProduction;
    cleanupSupabaseServiceTest();
  });
  
  describe('delete.commentsForRack', () => {
    it('should delete all comments for a rack entity', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      const mock = chainable<CommentDeleteRow>(successfulDelete);
      const filters = trackFilters(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.commentsForRack(7).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalledWith(DbPaths.comments);
          expect(filters).toContain(jasmine.objectContaining({
            column: 'entityId',
            operator: 'eq',
            value: 7
          }));
          expect(filters).toContain(jasmine.objectContaining({
            column: 'entityType',
            operator: 'eq',
            value: CommentableEntityTypes.RACK
          }));
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust the comments cache', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      spyOn(supabaseClient, 'from').and.returnValue(chainable<CommentDeleteRow>(successfulDelete));
      const bustedKeys: CachedEntity[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

      service.delete.commentsForRack(7).subscribe({
        next: () => {
          expect(bustedKeys).toContain('comments');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.delete.commentsForRack(7).subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err: Error) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.userModuleTag', () => {
    it('should delete tag vote for the current user', (done) => {
      mockUserSession(service, authUserFixture('voter-1'));
      
      const mock = chainable<UserModuleTagDeleteRow>(successfulDelete);
      const filterSpy: jasmine.Spy<SupabaseQueryChain<UserModuleTagDeleteRow>['filter']> =
        spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);
      
      service.delete.userModuleTag(33).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalledWith(DbPaths.user_module_tags);
          expect(filterSpy).toHaveBeenCalledWith('authorid', 'eq', 'voter-1');
          expect(filterSpy).toHaveBeenCalledWith('moduletagid', 'eq', 33);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.modulesOfRack', () => {
    it('should delete all rack modules for a given rack', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      const mock = chainable<RackModuleDeleteRow>(successfulDelete);
      const filterSpy: jasmine.Spy<SupabaseQueryChain<RackModuleDeleteRow>['filter']> =
        spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.modulesOfRack(5).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalledWith(DbPaths.rack_modules);
          expect(filterSpy).toHaveBeenCalledWith('rackid', 'eq', 5);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.delete.modulesOfRack(5).subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err: Error) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.patchConnectionsForPatch', () => {
    it('should delete all connections for a patch', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      const mock = chainable<PatchConnectionDeleteRow>(successfulDelete);
      const filterSpy: jasmine.Spy<SupabaseQueryChain<PatchConnectionDeleteRow>['filter']> =
        spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.patchConnectionsForPatch(12).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalledWith(DbPaths.patch_connections);
          expect(filterSpy).toHaveBeenCalledWith('patchid', 'eq', 12);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust patchConnections and patches caches', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      spyOn(supabaseClient, 'from').and.returnValue(chainable<PatchConnectionDeleteRow>(successfulDelete));
      const bustedKeys: CachedEntity[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

      service.delete.patchConnectionsForPatch(12).subscribe({
        next: () => {
          expect(bustedKeys).toContain('patchConnections');
          expect(bustedKeys).toContain('patches');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.delete.patchConnectionsForPatch(12).subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err: Error) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.patchModuleInstance', () => {
    it('should delete a single patch module instance by id', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      const mock = chainable<PatchModuleInstanceDeleteRow>(successfulDelete);
      const filterSpy: jasmine.Spy<SupabaseQueryChain<PatchModuleInstanceDeleteRow>['filter']> =
        spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.patchModuleInstance(8).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalledWith(DbPaths.patch_module_instances);
          expect(filterSpy).toHaveBeenCalledWith('id', 'eq', 8);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.delete.patchModuleInstance(8).subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err: Error) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('delete.patchModuleInstancesForPatch', () => {
    it('should delete all instances for a patch', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      const mock = chainable<PatchModuleInstanceDeleteRow>(successfulDelete);
      const filterSpy: jasmine.Spy<SupabaseQueryChain<PatchModuleInstanceDeleteRow>['filter']> =
        spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.patchModuleInstancesForPatch(20).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalledWith(DbPaths.patch_module_instances);
          expect(filterSpy).toHaveBeenCalledWith('patch_id', 'eq', 20);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.delete.patchModuleInstancesForPatch(20).subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err: Error) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('delete.modules (bulk)', () => {
    it('should delete a range of modules when authenticated', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      const mock = chainable<ModuleDeleteRow>(successfulDelete);
      const rangeSpy: jasmine.Spy<SupabaseQueryChain<ModuleDeleteRow>['range']> =
        spyOn(mock, 'range').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.modules(0, 10).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalledWith(DbPaths.modules);
          expect(rangeSpy).toHaveBeenCalledWith(0, 10);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust modules caches', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      spyOn(supabaseClient, 'from').and.returnValue(chainable<ModuleDeleteRow>(successfulDelete));
      const bustedKeys: CachedEntity[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));

      service.delete.modules().subscribe({
        next: () => {
          expect(bustedKeys).toContain('modules');
          expect(bustedKeys).toContain('moduleWithId');
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.delete.modules().subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err: Error) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('delete.manufacturer', () => {
    it('should delete a single manufacturer by id for admins', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      spyOn(service.auth, 'hasAdminRole$').and.returnValue(of(true));
      const mock = chainable<ManufacturerDeleteRow>(successfulDelete);
      const filterSpy: jasmine.Spy<SupabaseQueryChain<ManufacturerDeleteRow>['filter']> =
        spyOn(mock, 'filter').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.manufacturer(1626).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalledWith(DbPaths.manufacturers);
          expect(filterSpy).toHaveBeenCalledWith('id', 'eq', 1626);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error for non-admin users', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      spyOn(service.auth, 'hasAdminRole$').and.returnValue(of(false));

      service.delete.manufacturer(1626).subscribe({
        next: () => {
          fail('Expected admin error');
          done();
        },
        error: (err: Error) => {
          expect(err.message).toContain('Admin access required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('delete.manufacturers (bulk)', () => {
    it('should delete manufacturers in a range when authenticated', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      const mock = chainable<ManufacturerDeleteRow>(successfulDelete);
      const rangeSpy: jasmine.Spy<SupabaseQueryChain<ManufacturerDeleteRow>['range']> =
        spyOn(mock, 'range').and.returnValue(mock);
      spyOn(supabaseClient, 'from').and.returnValue(mock);

      service.delete.manufacturers(0, 5).subscribe({
        next: () => {
          expect(supabaseClient.from).toHaveBeenCalledWith(DbPaths.manufacturers);
          expect(rangeSpy).toHaveBeenCalledWith(0, 5);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.delete.manufacturers(0, 5).subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err: Error) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
});
