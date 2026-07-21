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
type UserModuleDeleteRow = Pick<SupabaseTableRow<'user_modules'>, 'moduleid' | 'profileid'>;
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

describe('SupabaseService - delete.userModule', () => {
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
  
  it('should delete the user_modules row by profileid and moduleid', (done) => {
    mockUserSession(service, authUserFixture('user-xyz'));
    
    const mock = chainable<UserModuleDeleteRow>(successfulDelete);
    const filterSpy: jasmine.Spy<SupabaseQueryChain<UserModuleDeleteRow>['filter']> =
      spyOn(mock, 'filter').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.delete.userModule(55).subscribe({
      next: () => {
        expect(filterSpy).toHaveBeenCalledWith('profileid', 'eq', 'user-xyz');
        expect(filterSpy).toHaveBeenCalledWith('moduleid', 'eq', 55);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust currentUserModules and currentUserComments caches', (done) => {
    mockUserSession(service, authUserFixture('u'));
    spyOn(supabaseClient, 'from').and.returnValue(chainable<UserModuleDeleteRow>(successfulDelete));
    
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
    
    service.delete.userModule(1).subscribe({
      next: () => {
        expect(bustedKeys).toContain('currentUserModules');
        expect(bustedKeys).toContain('currentUserComments');
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should delete associated module comments after deleting the user module ownership row', (done) => {
    mockUserSession(service, authUserFixture('u'));
    
    const tablesAccessed: string[] = [];
    const userModulesDelete = chainable<UserModuleDeleteRow>(successfulDelete);
    const commentsDelete = chainable<CommentDeleteRow>(successfulDelete);
    spyOn(supabaseClient, 'from').and.callFake((table: string) => {
      tablesAccessed.push(table);
      if (table === DbPaths.comments) return commentsDelete;
      return userModulesDelete;
    });
    
    service.delete.userModule(10).subscribe({
      next: () => {
        expect(tablesAccessed).toEqual([DbPaths.user_modules, DbPaths.comments]);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should scope associated comment deletion to the module entity id and type', (done) => {
    mockUserSession(service, authUserFixture('u'));

    const userModulesDelete = chainable<UserModuleDeleteRow>(successfulDelete);
    const commentsDelete = chainable<CommentDeleteRow>(successfulDelete);
    const commentFilters = trackFilters(commentsDelete);

    spyOn(supabaseClient, 'from').and.callFake((table: string) => {
      if (table === DbPaths.comments) return commentsDelete;
      return userModulesDelete;
    });

    service.delete.userModule(10).subscribe({
      next: () => {
        expect(commentFilters).toContain(jasmine.objectContaining({
          column: 'entityId',
          operator: 'eq',
          value: 10
        }));
        expect(commentFilters).toContain(jasmine.objectContaining({
          column: 'entityType',
          operator: 'eq',
          value: CommentableEntityTypes.MODULE
        }));
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - delete.modules (range)', () => {
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
  
  it('should delete modules in the specified range', (done) => {
    mockUserSession(service, authUserFixture('admin'));
    
    const mock = chainable<ModuleDeleteRow>(successfulDelete);
    const rangeSpy: jasmine.Spy<SupabaseQueryChain<ModuleDeleteRow>['range']> =
      spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.delete.modules(0, 9).subscribe({
      next: () => {
        expect(rangeSpy).toHaveBeenCalledWith(0, 9);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust modules caches', (done) => {
    mockUserSession(service, authUserFixture('admin'));
    spyOn(supabaseClient, 'from').and.returnValue(chainable<ModuleDeleteRow>(successfulDelete));
    
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
    
    service.delete.modules(0, 4).subscribe({
      next: () => {
        expect(bustedKeys).toContain('modules');
        expect(bustedKeys).toContain('currentUserModules');
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should throw when user is not authenticated', (done) => {
    mockUserSession(service, null);
    
    service.delete.modules(0, 5).subscribe({
      next: () => {
        fail('should have errored');
        done();
      },
      error: (err: Error) => {
        expect(err.message).toContain('Authentication required');
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('SupabaseService - delete.manufacturers (range)', () => {
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
  
  it('should delete manufacturers in the specified range', (done) => {
    mockUserSession(service, authUserFixture('admin'));
    
    const mock = chainable<ManufacturerDeleteRow>(successfulDelete);
    const rangeSpy: jasmine.Spy<SupabaseQueryChain<ManufacturerDeleteRow>['range']> =
      spyOn(mock, 'range').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.delete.manufacturers(0, 4).subscribe({
      next: () => {
        expect(rangeSpy).toHaveBeenCalledWith(0, 4);
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should bust manufacturers cache', (done) => {
    mockUserSession(service, authUserFixture('admin'));
    spyOn(supabaseClient, 'from').and.returnValue(chainable<ManufacturerDeleteRow>(successfulDelete));
    
    const bustedKeys: CachedEntity[] = [];
    service.cacheResetter$.subscribe(keys => bustedKeys.push(...keys));
    
    service.delete.manufacturers(0, 3).subscribe({
      next: () => {
        expect(bustedKeys).toContain('manufacturers');
        done();
      },
      error: (err: unknown) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should throw when user is not authenticated', (done) => {
    mockUserSession(service, null);
    
    service.delete.manufacturers(0, 5).subscribe({
      next: () => {
        fail('should have errored');
        done();
      },
      error: (err: Error) => {
        expect(err.message).toContain('Authentication required');
        done();
      }
    });
  }, TEST_TIMEOUT);
});
