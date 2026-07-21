import { SupabaseService } from '../../supabase.service';
import type { CachedEntity } from '../../supabase.cache';
import type { SupabaseTableRow } from '../../supabase-db.types';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { CommentableEntityTypes } from '../../supabase-comments';
import {
  authUserFixture,
  chainable,
  getSupabaseClientDouble,
  mockUserSession,
  type QueryChainResult,
  type QueryListRowsResult,
  type SupabaseClientDouble,
  type SupabaseQueryChain
} from './supabase-query-test-doubles';


type CommentDeleteRow = Pick<SupabaseTableRow<'comments'>, 'id'>;
type ModuleDeleteRow = Pick<SupabaseTableRow<'modules'>, 'id'>;
type PatchDeleteRow = Pick<SupabaseTableRow<'patches'>, 'id'>;
type PatchModuleInstanceDeleteRow = Pick<SupabaseTableRow<'patch_module_instances'>, 'id'>;
type RackDeleteRow = Pick<SupabaseTableRow<'racks'>, 'id'>;
type DeleteFilterValue = Parameters<SupabaseQueryChain<unknown>['filter']>[2];
type DeleteFilterCall = {
  column: string;
  operator: string;
  value: DeleteFilterValue;
};

const successfulDelete = {data: null, error: null} satisfies QueryChainResult<never>;

function deletedRows<Row>(rows: Row[]) {
  return {data: rows, error: null} satisfies QueryListRowsResult<Row>;
}

function trackFilters<Row>(mock: SupabaseQueryChain<Row>): DeleteFilterCall[] {
  const filters: DeleteFilterCall[] = [];
  spyOn(mock, 'filter').and.callFake((column: string, operator: string, value: DeleteFilterValue) => {
    filters.push({column, operator, value});
    return mock;
  });
  return filters;
}

describe('SupabaseService - delete complex operations', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  describe('delete.module', () => {
    beforeEach(() => {
      mockUserSession(service, authUserFixture('test-user'));
    });

    it('should delete comments then the module itself', (done) => {
      const tablesAccessed: string[] = [];
      
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        tablesAccessed.push(table);
        return chainable<ModuleDeleteRow>(deletedRows([{id: 42}]));
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

    it('should scope deleted comments to the module entity id and type', (done) => {
      const commentMock = chainable<CommentDeleteRow>(successfulDelete);
      const commentFilters = trackFilters(commentMock);

      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'comments') return commentMock;
        return chainable<ModuleDeleteRow>(deletedRows([{id: 42}]));
      });

      service.delete.module(42).subscribe({
        next: () => {
          expect(commentFilters).toContain(jasmine.objectContaining({
            column: 'entityId',
            operator: 'eq',
            value: 42
          }));
          expect(commentFilters).toContain(jasmine.objectContaining({
            column: 'entityType',
            operator: 'eq',
            value: CommentableEntityTypes.MODULE
          }));
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust module caches', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable<ModuleDeleteRow>(deletedRows([{id: 1}])));
      const bustedKeys: CachedEntity[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
      
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
    beforeEach(() => {
      mockUserSession(service, authUserFixture('test-user'));
    });

    it('should delete module instances, patch, and comments in sequence', (done) => {
      const tablesAccessed: string[] = [];
      
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        tablesAccessed.push(table);
        return chainable<PatchDeleteRow>(successfulDelete);
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

    it('should scope deleted comments to the patch entity id and type', (done) => {
      const commentMock = chainable<CommentDeleteRow>(successfulDelete);
      const commentFilters = trackFilters(commentMock);

      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'comments') return commentMock;
        return chainable<PatchDeleteRow>(successfulDelete);
      });

      service.delete.patch(5).subscribe({
        next: () => {
          expect(commentFilters).toContain(jasmine.objectContaining({
            column: 'entityId',
            operator: 'eq',
            value: 5
          }));
          expect(commentFilters).toContain(jasmine.objectContaining({
            column: 'entityType',
            operator: 'eq',
            value: CommentableEntityTypes.PATCH
          }));
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust patches cache', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(chainable<PatchDeleteRow>(successfulDelete));
      const bustedKeys: CachedEntity[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
      
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
      const mockUser = authUserFixture('owner-1');
      mockUserSession(service, mockUser);
      
      const tablesAccessed: string[] = [];
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        tablesAccessed.push(table);
        return chainable<PatchDeleteRow>(successfulDelete);
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
      const mockUser = authUserFixture('owner-2');
      mockUserSession(service, mockUser);
      
      const patchMock = chainable<PatchDeleteRow>(successfulDelete);
      const filterSpy: jasmine.Spy<SupabaseQueryChain<PatchDeleteRow>['filter']> =
        spyOn(patchMock, 'filter').and.returnValue(patchMock);
      
      spyOn(supabaseClient, 'from').and.callFake((table: string) => {
        if (table === 'patches') return patchMock;
        return chainable<PatchModuleInstanceDeleteRow>(successfulDelete);
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
      const mockUser = authUserFixture('rack-owner');
      mockUserSession(service, mockUser);
      
      const mock = chainable<RackDeleteRow>(successfulDelete);
      const filterSpy: jasmine.Spy<SupabaseQueryChain<RackDeleteRow>['filter']> =
        spyOn(mock, 'filter').and.returnValue(mock);
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
      const mockUser = authUserFixture('rack-owner');
      mockUserSession(service, mockUser);
      spyOn(supabaseClient, 'from').and.returnValue(chainable<RackDeleteRow>(successfulDelete));
      
      const bustedKeys: CachedEntity[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
      
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

  describe('delete.commentsForRack', () => {
    it('should scope deleted comments to the rack entity id and type', (done) => {
      mockUserSession(service, authUserFixture('rack-comment-owner'));

      const commentMock = chainable<CommentDeleteRow>(successfulDelete);
      const commentFilters = trackFilters(commentMock);
      spyOn(supabaseClient, 'from').and.returnValue(commentMock);

      service.delete.commentsForRack(12).subscribe({
        next: () => {
          expect(commentFilters).toContain(jasmine.objectContaining({
            column: 'entityId',
            operator: 'eq',
            value: 12
          }));
          expect(commentFilters).toContain(jasmine.objectContaining({
            column: 'entityType',
            operator: 'eq',
            value: CommentableEntityTypes.RACK
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