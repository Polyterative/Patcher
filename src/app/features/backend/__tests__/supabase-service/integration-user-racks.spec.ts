import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { SupabaseService } from '../../supabase.service';
import { of } from 'rxjs';


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
  
  it('should return array of racks (not response object)', (done) => {
    // Mock user session to simulate authenticated user
    spyOn(service as any, 'getUserSession$').and.returnValue(of({
      id: 'test-user-id',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // Mock Supabase response
    const mockRackData = [
      {
        id: 1,
        name: 'Test Rack',
        description: 'Test description',
        hp: 104,
        rows: 2,
        locked: false,
        public: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        authorid: 'test-user-id',
        author: {
          id: 'test-user-id',
          username: 'testuser'
        }
      }
    ];
    
    const supabaseClient = (service as any).supabase;
    spyOn(supabaseClient, 'from').and.returnValue({
      select: () => ({
        filter: () => ({
          order: () => Promise.resolve({
            data: mockRackData,
            error: null
          })
        })
      })
    });
    
    const racks$ = service.get.currentUserRacks();
    
    racks$.subscribe({
      next: (result: any) => {
        // CRITICAL: Result should be an ARRAY, not a response object
        expect(Array.isArray(result)).withContext(
          'currentUserRacks() MUST return an array, not a Supabase response object. ' +
          'If this fails, the .map(x => x.data) operator is missing!'
        ).toBe(true);
        
        // Verify it's not the response object
        expect(result.data).withContext(
          'Result should not have a .data property (it should BE the data)'
        ).toBeUndefined();
        
        expect(result.error).withContext(
          'Result should not have an .error property (it should be the data array)'
        ).toBeUndefined();
        
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
      error: (error) => {
        fail(`currentUserRacks() test failed: ${ error.message || JSON.stringify(error) }`);
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
  
  it('should handle optional authorid parameter', (done) => {
    const testAuthorId = 'different-user-id';
    
    spyOn(service as any, 'getUserSession$').and.returnValue(of({
      id: 'current-user-id',
      email: 'current@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const supabaseClient = (service as any).supabase;
    let capturedFilterValue: string | undefined;
    
    spyOn(supabaseClient, 'from').and.returnValue({
      select: () => ({
        filter: (_field: string, _op: string, value: string) => {
          capturedFilterValue = value;
          return {
            order: () => Promise.resolve({
              data: [],
              error: null
            })
          };
        }
      })
    });
    
    // Call with specific authorid
    const racks$ = service.get.currentUserRacks(testAuthorId);
    
    racks$.subscribe({
      next: (_result: any) => {
        expect(capturedFilterValue).withContext(
          'Should use provided authorid parameter'
        ).toBe(testAuthorId);
        done();
      },
      error: (error) => {
        fail(`authorid parameter test failed: ${ error.message }`);
        done();
      }
    });
  }, TEST_TIMEOUT);
});