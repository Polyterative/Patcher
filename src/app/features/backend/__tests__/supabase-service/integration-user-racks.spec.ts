import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { SupabaseService } from '../../supabase.service';
import { firstValueFrom } from 'rxjs';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Rack } from 'src/app/models/rack';
import type { Database } from 'src/backend/database.types';
import {
  authUserFixture,
  chainable,
  formatUnknownError,
  getSupabaseClientDouble,
  mockUserSession,
  type QueryChainResult,
  type QueryListRowsResult
} from './supabase-query-test-doubles';

type RackRow = Database['public']['Tables']['racks']['Row'];
type RackFixture = Rack & Pick<RackRow, 'authorid'>;

interface CurrentUserRackSelectQuery<Row> {
  select(columns: string): {
    filter(column: string, operator: string, value: string): {
      order(column: string, options: {ascending: boolean}): Promise<QueryChainResult<Row>>;
    };
  };
}

function currentUserListQuery<T>(response: QueryChainResult<T>): CurrentUserRackSelectQuery<T> {
  return {
    select: () => ({
      filter: () => ({
        order: () => Promise.resolve(response)
      })
    })
  };
}

function rackFixture(overrides: Partial<RackFixture> = {}): RackFixture {
  return {
    id: 1,
    name: 'Test Rack',
    description: 'Test description',
    hp: 104,
    rows: 2,
    locked: false,
    public: true,
    created: '2026-07-21T00:00:00Z',
    updated: '2026-07-21T00:00:00Z',
    authorid: 'test-user-id',
    author: {
      id: 'test-user-id',
      username: 'testuser'
    },
    ...overrides
  };
}


/**
 * Database Integration Tests - User Racks
 *
 * CRITICAL REGRESSION TEST
 *
 * This test prevents the bug where currentUserRacks() was returning the entire
 * Supabase response object instead of just the data array.
 *
 * Bug History (2026-02-18):
 * - During backend refactoring (commit e2466f89), the .map(x => x.data) operator
 *   was accidentally removed from currentUserRacks()
 * - This caused the method to return {data: [...], error: null, ...} instead of [...]
 * - The UI component expected an array, causing user racks to not display
 *
 * This test ensures:
 * 1. The method returns an observable
 * 2. The observable emits an ARRAY (not a response object)
 * 3. The array contains Rack objects with proper structure
 * 4. The response matches the same pattern as currentUserPatches()
 */
describe('SupabaseService - currentUserRacks Integration', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });

  it('falls back by default and throws in strict mode when Supabase returns an error response for current user racks', async () => {
    const testAuthorId = 'current-user-racks-error';
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

    await expectAsync(firstValueFrom(service.get.currentUserRacks())).toBeResolvedTo([]);
    await expectAsync(firstValueFrom(service.get.currentUserRacks(true))).toBeRejectedWith(transientError);
  });

  it('returns an empty array for successful empty current user rack responses', async () => {
    const testAuthorId = 'current-user-racks-empty';
    mockUserSession(service, authUserFixture(testAuthorId));

    const supabaseClient = getSupabaseClientDouble(service);
    spyOn(supabaseClient, 'from').and.returnValue(currentUserListQuery<RackFixture>({
      data: [],
      error: null
    } satisfies QueryListRowsResult<RackFixture>));

    await expectAsync(firstValueFrom(service.get.currentUserRacks())).toBeResolvedTo([]);
  });
  
  it('should return array of racks (not response object)', (done) => {
    mockUserSession(service, authUserFixture('test-user-id'));
    
    // Mock Supabase response
    const mockRackData: RackFixture[] = [rackFixture()];
    
    const supabaseClient = getSupabaseClientDouble(service);
    const query = chainable<RackFixture>({
      data: mockRackData,
      error: null
    } satisfies QueryListRowsResult<RackFixture>);
    spyOn(query, 'select').and.callThrough();
    spyOn(query, 'filter').and.callThrough();
    spyOn(query, 'order').and.callThrough();
    spyOn(supabaseClient, 'from').and.returnValue(query);
    
    const racks$ = service.get.currentUserRacks();
    
    racks$.subscribe({
      next: result => {
        // CRITICAL: Result should be an ARRAY, not a response object
        expect(Array.isArray(result)).withContext(
          'currentUserRacks() MUST return an array, not a Supabase response object. ' +
          'If this fails, the .map(x => x.data) operator is missing!'
        ).toBe(true);
        
        // Verify it's not the response object
        expect(Reflect.has(result, 'data')).withContext(
          'Result should not have a .data property (it should BE the data)'
        ).toBe(false);
        
        expect(Reflect.has(result, 'error')).withContext(
          'Result should not have an .error property (it should be the data array)'
        ).toBe(false);
        
        expect(query.select).toHaveBeenCalledWith('id,name,description,hp,rows,image,public,public_id,created,updated, author:authorid(username,id)');
        expect(query.filter).toHaveBeenCalledWith('authorid', 'eq', 'test-user-id');
        expect(query.order).toHaveBeenCalledWith('updated', {ascending: false});

        // Verify array content
        if (result.length > 0) {
          const rack = result[0];
          expect(rack.id).withContext('Rack should have id').toBeDefined();
          expect(rack.name).withContext('Rack should have name').toBeDefined();
          expect(typeof rack.name).withContext('Rack name should be string').toBe('string');
          expect(rack.hp).withContext('Rack should have hp').toBeDefined();
          expect(rack.rows).withContext('Rack should have rows').toBeDefined();
        }
        
        done();
      },
      error: (error: unknown) => {
        fail(`currentUserRacks() test failed: ${ formatUnknownError(error) }`);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should select an explicit column list, not the full wildcard row', (done) => {
    mockUserSession(service, authUserFixture('test-user-id'));

    const supabaseClient = getSupabaseClientDouble(service);
    const query = chainable<RackFixture>({
      data: [],
      error: null
    } satisfies QueryListRowsResult<RackFixture>);
    const selectSpy = spyOn(query, 'select').and.callThrough();
    spyOn(supabaseClient, 'from').and.returnValue(query);

    const racks$ = service.get.currentUserRacks();

    racks$.subscribe({
      next: () => {
        const selectArg = selectSpy.calls.mostRecent().args[0] as string;
        expect(selectArg).not.toContain('*');
        expect(selectArg).not.toContain('locked');
        expect(selectArg).toContain('id,name,description,hp,rows,image,public,public_id,created,updated');
        expect(selectArg).toContain('author:authorid(username,id)');
        done();
      },
      error: (error: unknown) => {
        fail(`currentUserRacks() column-trim test failed: ${ formatUnknownError(error) }`);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('should match the same return pattern as currentUserPatches()', () => {
    // Both methods should have identical response handling patterns
    // This test validates structural consistency by checking return types
    
    const racks$ = service.get.currentUserRacks();
    const patches$ = service.get.currentUserPatches();
    
    // Both should return observables
    expect(racks$).toBeDefined();
    expect(patches$).toBeDefined();
    expect(typeof racks$.subscribe).toBe('function');
    expect(typeof patches$.subscribe).toBe('function');
    
    // Both should be Observable instances
    expect(racks$.constructor.name).toContain('Observable');
    expect(patches$.constructor.name).toContain('Observable');
  });
  
  it('should use the current session authorid when querying racks', (done) => {
    const testAuthorId = 'different-user-id';
    mockUserSession(service, authUserFixture(testAuthorId));
    
    const supabaseClient = getSupabaseClientDouble(service);
    let capturedFilterValue: string | undefined;
    const query = chainable<RackFixture>({
      data: [],
      error: null
    } satisfies QueryListRowsResult<RackFixture>);
    
    spyOn(query, 'filter').and.callFake((_field: string, _op: string, value: string) => {
      capturedFilterValue = value;
      return query;
    });
    spyOn(query, 'order').and.callThrough();
    spyOn(supabaseClient, 'from').and.returnValue(query);
    
    const racks$ = service.get.currentUserRacks();
    
    racks$.subscribe({
      next: () => {
        expect(capturedFilterValue).withContext(
          'Should use the current session authorid'
        ).toBe(testAuthorId);
        expect(query.filter).toHaveBeenCalledWith('authorid', 'eq', testAuthorId);
        expect(query.order).toHaveBeenCalledWith('updated', {ascending: false});
        done();
      },
      error: (error: unknown) => {
        fail(`session authorid test failed: ${ formatUnknownError(error) }`);
        done();
      }
    });
  }, TEST_TIMEOUT);
});
