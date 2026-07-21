import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { SupabaseService } from '../../supabase.service';
import {
  firstValueFrom
} from 'rxjs';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Database } from 'src/backend/database.types';
import type { Patch } from 'src/app/models/patch';
import {
  authUserFixture,
  chainable,
  formatUnknownError,
  getSupabaseClientDouble,
  mockUserSession,
  type QueryChainResult,
  type QueryListRowsResult,
  type QuerySingleRowResult
} from './supabase-query-test-doubles';

type PatchRow = Database['public']['Tables']['patches']['Row'];
type PatchInsert = Database['public']['Tables']['patches']['Insert'];
type PatchUpdate = Database['public']['Tables']['patches']['Update'];
type PatchAuthor = Patch['author'] & {email?: string};
type PatchFixture = Patch & Pick<PatchRow, 'authorid'> & {
  author: PatchAuthor;
};
type PatchListItem = Pick<Patch, 'id' | 'name' | 'public'>;
type PatchBrowserResult = QueryChainResult<PatchListItem> & {
  data: PatchListItem[] | null;
  count: number | null;
  error: null;
};

interface PatchSelectQuery<Row> {
  select(columns: string): {
    filter(column: string, operator: string, value: string): {
      order(column: string, options: {ascending: boolean}): Promise<QueryChainResult<Row>>;
    };
  };
}

type PatchBrowserQuery = PromiseLike<QueryChainResult<PatchListItem>> & {
  filter(column: string, operator: string, value: boolean): PatchBrowserQuery;
  order(column: string, options: {ascending: boolean}): PatchBrowserQuery;
  range(from: number, to: number): PatchBrowserQuery;
};

interface PatchBrowserFromResult {
  select(columns: string, options?: {count: 'exact'}): PatchBrowserQuery;
}

function currentUserListQuery<T>(response: QueryChainResult<T>): PatchSelectQuery<T> {
  return {
    select: () => ({
      filter: () => ({
        order: () => Promise.resolve(response)
      })
    })
  };
}

function patchFixture(overrides: Partial<PatchFixture> = {}): PatchFixture {
  return {
    id: 1,
    name: 'Test Patch',
    description: 'Test description',
    public: false,
    public_id: 'patch-public-id',
    tags: [],
    created: '2026-07-21T00:00:00Z',
    updated: '2026-07-21T00:00:00Z',
    authorid: 'test-user-id',
    author: {
      id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com'
    },
    ...overrides
  };
}

function patchBrowserQuery(resolveResult: () => PatchBrowserResult): PatchBrowserQuery {
  const query: PatchBrowserQuery = {
    filter: () => query,
    order: () => query,
    range: () => query,
    then<TResult1 = QueryChainResult<PatchListItem>, TResult2 = never>(
      onfulfilled?: ((value: QueryChainResult<PatchListItem>) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> {
      return Promise.resolve(resolveResult()).then(onfulfilled, onrejected);
    }
  };

  return query;
}

function patchBrowserFromResult(query: PatchBrowserQuery): PatchBrowserFromResult {
  return {
    select: () => query
  };
}


/**
 * Database Integration Tests - User Patches with Privacy
 *
 * Tests for patch privacy feature implemented 2026-02-18
 *
 * Feature Requirements:
 * - Patches should have a `public` field (boolean)
 * - New patches default to public: true
 * - Users can toggle privacy via requestPatchPrivacyStatusChange$
 * - Private patches show lock icon, public patches show public icon
 * - Privacy state tracked via isCurrentPatchPrivate$
 */
describe('SupabaseService - Patch Privacy Integration', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });

  it('falls back by default and throws in strict mode when Supabase returns an error response for current user patches', async () => {
    const testAuthorId = 'current-user-patches-error';
    const transientError: PostgrestError = {
      code: 'PGRST003',
      details: null,
      hint: null,
      message: 'Service temporarily unavailable',
      name: 'PostgrestError'
    };
    mockUserSession(service, authUserFixture(testAuthorId));

    const supabaseClient = getSupabaseClientDouble(service);
    spyOn(supabaseClient, 'from').and.returnValue(currentUserListQuery({data: null, error: transientError}));

    await expectAsync(firstValueFrom(service.get.currentUserPatches())).toBeResolvedTo([]);
    await expectAsync(firstValueFrom(service.get.currentUserPatches(true))).toBeRejectedWith(transientError);
  });

  it('returns an empty array for successful empty current user patch responses', async () => {
    const testAuthorId = 'current-user-patches-empty';
    mockUserSession(service, authUserFixture(testAuthorId));

    const supabaseClient = getSupabaseClientDouble(service);
    spyOn(supabaseClient, 'from').and.returnValue(currentUserListQuery({data: [], error: null}));

    await expectAsync(firstValueFrom(service.get.currentUserPatches())).toBeResolvedTo([]);
  });
  
  it('should create new patches with public: true by default', (done) => {
    mockUserSession(service, authUserFixture('test-user-id'));
    
    const supabaseClient = getSupabaseClientDouble(service);
    let insertedData: PatchInsert | null = null;
    
    // Spy on the insert call to capture what's being sent
    const mock = chainable<{id: number; name: string}>({
      data: [{id: 1, name: 'Test Patch'}],
      error: null
    } satisfies QueryListRowsResult<{id: number; name: string}>);
    spyOn(mock, 'insert').and.callFake((data) => {
      insertedData = Array.isArray(data) ? null : data as PatchInsert;
      return mock;
    });
    spyOn(mock, 'select').and.returnValue(mock);
    spyOn(supabaseClient, 'from').and.returnValue(mock);
    
    service.add.patch({name: 'Test Patch'}).subscribe({
      next: () => {
        // Verify public field is set to true
        expect(insertedData?.public).withContext(
          'New patches must default to public: true'
        ).toBe(true);
        
        expect(insertedData?.name).toBe('Test Patch');
        expect(insertedData?.authorid).toBe('test-user-id');
        
        done();
      },
      error: (err: unknown) => {
        fail(`Should not error: ${  formatUnknownError(err)}`);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should retrieve patches with public field', (done) => {
    const mockPatchData = patchFixture();
    
    const supabaseClient = getSupabaseClientDouble(service);
    spyOn(supabaseClient, 'from').and.returnValue(chainable<PatchFixture>({
      data: mockPatchData,
      error: null
    } satisfies QuerySingleRowResult<PatchFixture>));
    
    service.get.patchWithId(1).subscribe({
      next: result => {
        expect(result.data).toBeDefined();
        expect(result.data.public).withContext(
          'Patch data must include public field'
        ).toBe(false);
        expect(result.data.name).toBe('Test Patch');
        
        done();
      },
      error: (err: unknown) => {
        fail(`Should not error: ${  formatUnknownError(err)}`);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should update patch privacy status', (done) => {
    mockUserSession(service, authUserFixture('test-user-id'));

    const testPatch = patchFixture({
      description: 'Test',
      public: true,
    });
    
    const supabaseClient = getSupabaseClientDouble(service);
    let updatedData: PatchUpdate | null = null;

    const updateChain = chainable<PatchFixture>({
      data: {...testPatch, public: false},
      error: null
    } satisfies QuerySingleRowResult<PatchFixture>);
    spyOn(updateChain, 'update').and.callFake((data) => {
      updatedData = data as PatchUpdate;
      return updateChain;
    });
    spyOn(supabaseClient, 'from').and.returnValue(updateChain);
    
    // Toggle privacy (public -> private)
    const patchToUpdate = {...testPatch, public: false};
    
    service.update.patch(patchToUpdate).subscribe({
      next: () => {
        // Verify the public field was updated
        expect(updatedData?.public).withContext(
          'Patch privacy field should be updated'
        ).toBe(false);
        
        done();
      },
      error: (err: unknown) => {
        fail(`Should not error: ${  formatUnknownError(err)}`);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should return array of patches with public field (not response object)', (done) => {
    mockUserSession(service, authUserFixture('test-user-id'));
    
    const mockPatchData: PatchFixture[] = [
      patchFixture({
        id: 1,
        name: 'Public Patch',
        description: 'Public',
        public: true
      }),
      patchFixture({
        id: 2,
        name: 'Private Patch',
        description: 'Private',
        public: false
      })
    ];
    
    const supabaseClient = getSupabaseClientDouble(service);
    spyOn(supabaseClient, 'from').and.returnValue(currentUserListQuery<PatchFixture>({
      data: mockPatchData,
      error: null
    } satisfies QueryListRowsResult<PatchFixture>));
    
    service.get.currentUserPatches().subscribe({
      next: result => {
        // Verify it's an array
        expect(Array.isArray(result)).withContext(
          'currentUserPatches() must return an array'
        ).toBe(true);
        
        // Verify patches have public field
        expect(result.length).toBe(2);
        expect(result[0].public).toBe(true);
        expect(result[1].public).toBe(false);
        
        done();
      },
      error: (err: unknown) => {
        fail(`Should not error: ${  formatUnknownError(err)}`);
        done();
      }
    });
  }, TEST_TIMEOUT);
});

/**
 * Regression Tests - Patch Browser Public Filtering
 *
 * Regression: 2026-02-19 — Private patches were visible in the public patch
 * browser because GET.patches did not apply a `public = true` filter.
 */
describe('SupabaseService - Patch Browser Public Filtering (regression)', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should apply public=true filter when fetching patches for the browser', (done) => {
    const supabaseClient = getSupabaseClientDouble(service);
    const query = chainable<PatchListItem>({
      data: [],
      count: 0,
      error: null
    } satisfies PatchBrowserResult);
    spyOn(query, 'filter').and.callThrough();
    spyOn(query, 'order').and.callThrough();
    spyOn(query, 'range').and.callThrough();
    
    spyOn(supabaseClient, 'from').and.returnValue(patchBrowserFromResult(query));
    
    service.GET.patches(0, 19).subscribe({
      next: () => {
        expect(query.filter).withContext(
          'GET.patches must filter by public=true to exclude private patches from the browser'
        ).toHaveBeenCalledWith('public', 'eq', true);
        expect(query.order).toHaveBeenCalledBefore(query.range);
        expect(query.range).toHaveBeenCalledWith(0, 19);
        done();
      },
      error: (err: unknown) => {
        fail(`Should not error: ${  formatUnknownError(err)}`);
        done();
      }
    });
  }, TEST_TIMEOUT);
  
  it('should not return private patches from GET.patches', (done) => {
    const supabaseClient = getSupabaseClientDouble(service);
    
    const mockPublicOnly: PatchListItem[] = [{id: 1, name: 'Public Patch', public: true}];
    
    // If the public filter is missing, the mock leaks private patches through
    let hasPublicFilter = false;
    const query = patchBrowserQuery(() => hasPublicFilter
      ? {data: mockPublicOnly, count: 1, error: null}
      : {
        data: [
          {id: 1, name: 'Public Patch', public: true},
          {id: 2, name: 'Private Patch', public: false}
        ],
        count: 2,
        error: null
      });
    spyOn(query, 'filter').and.callFake((col: string, op: string, val: boolean) => {
      if (col === 'public' && op === 'eq' && val === true) {
        hasPublicFilter = true;
      }
      return query;
    });
    spyOn(supabaseClient, 'from').and.returnValue(patchBrowserFromResult(query));
    
    service.GET.patches(0, 19).subscribe({
      next: result => {
        const patches = result.data ?? [];
        const hasPrivate = patches.some(p => p.public === false);
        expect(hasPrivate).withContext(
          'Private patches must not appear in the public patch browser'
        ).toBe(false);
        expect(patches.length).toBe(1);
        done();
      },
      error: (err: unknown) => {
        fail(`Should not error: ${  formatUnknownError(err)}`);
        done();
      }
    });
  }, TEST_TIMEOUT);
});
