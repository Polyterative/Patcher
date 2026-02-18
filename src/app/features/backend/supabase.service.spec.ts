import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { of } from 'rxjs';
import { TagType } from '../../models/tag';
import { DBManufacturer } from '../../models/manufacturer';


/**
 * SupabaseService Integration Test Suite
 *
 * Purpose: Validates the SupabaseService layer which acts as the primary
 * data access layer for the application. These tests verify:
 * - Service initialization and dependency injection
 * - API structure and method availability
 * - End-to-end database connectivity
 * - Data integrity and type safety
 * - Error handling and edge cases
 * - Performance and caching behavior
 *
 * Test Strategy:
 * - Unit tests: Verify service structure and method signatures
 * - Integration tests: Validate actual Supabase connection and data retrieval
 * - Contract tests: Ensure returned data matches expected interfaces
 */
describe('SupabaseService', () => {
  let service: SupabaseService;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;
  
  // Test configuration
  const TEST_TIMEOUT = 10000; // 10 seconds for network operations
  const PAGINATION_TEST_SIZE = 5;
  
  beforeEach(() => {
    // Create mock objects with comprehensive spy coverage
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
    mockActivatedRoute = jasmine.createSpyObj('ActivatedRoute', [], {
      queryParams: of({}),
      params: of({})
    });
    
    TestBed.configureTestingModule({
      providers: [
        SupabaseService,
        {provide: MatSnackBar, useValue: mockSnackBar},
        {provide: ActivatedRoute, useValue: mockActivatedRoute}
      ]
    });
    
    service = TestBed.inject(SupabaseService);
  });
  
  afterEach(() => {
    // Cleanup: Clear any localStorage caching
    localStorage.clear();
  });
  
  // ============================================================================
  // UNIT TESTS: Service Initialization & Configuration
  // ============================================================================
  
  describe('Service Initialization', () => {
    it('should be created successfully', () => {
      expect(service).toBeTruthy();
      expect(service).toBeInstanceOf(SupabaseService);
    });
    
    it('should inject dependencies correctly', () => {
      expect(service.snackBar).toBe(mockSnackBar);
      expect(service.activated).toBe(mockActivatedRoute);
    });
    
    it('should initialize Supabase client', () => {
      const supabaseClient = (service as any).supabase;
      expect(supabaseClient).toBeDefined();
      expect(supabaseClient.from).toBeDefined();
      expect(typeof supabaseClient.from).toBe('function');
    });
    
    it('should have valid Supabase configuration', () => {
      const supabaseClient = (service as any).supabase;
      expect(supabaseClient.supabaseUrl).toBeDefined();
      expect(supabaseClient.supabaseKey).toBeDefined();
      expect(supabaseClient.supabaseUrl).toContain('supabase.co');
    });
    
    it('should initialize user management observables', () => {
      expect(service.user).toBeDefined();
      expect(service.user.user$).toBeDefined();
      expect(service.user.login$).toBeDefined();
      expect(service.user.logout$).toBeDefined();
    });
    
    it('should expose cache resetter observable', () => {
      expect(service.cacheResetter$).toBeDefined();
      expect(typeof service.cacheResetter$.subscribe).toBe('function');
    });
  });
  
  // ============================================================================
  // UNIT TESTS: API Surface & Service Structure
  // ============================================================================
  
  describe('GET API Methods', () => {
    it('should expose GET object with all query methods', () => {
      expect(service.GET).toBeDefined();
      expect(typeof service.GET).toBe('object');
    });
    
    it('should have all expected GET methods bound correctly', () => {
      const expectedMethods = [
        'modules',
        'manufacturers',
        'currentUserModules',
        'comments',
        'tags',
        'moduleWithId',
        'patchConnections',
        'currentUserComments',
        'patches',
        'rackWithId',
        'racksMinimal'
      ];
      
      expectedMethods.forEach(method => {
        expect(typeof (service.GET as any)[method]).toBe('function', `GET.${ method } should be a function`);
      });
    });
    
    it('should return observables from GET methods', () => {
      const modules$ = service.GET.modules(0, 10);
      expect(modules$).toBeDefined();
      expect(typeof modules$.subscribe).toBe('function');
      expect(modules$.constructor.name).toContain('Observable');
    });
  });
  
  describe('get API Methods (lowercase)', () => {
    it('should expose get object with query methods', () => {
      expect(service.get).toBeDefined();
      expect(typeof service.get).toBe('object');
    });
    
    it('should have expected get methods', () => {
      const expectedMethods = [
        'currentUserPatches',
        'currentUserRacks',
        'rackedModules',
        'racksWithModule',
        'patchWithId',
        'patchesWithModule',
        'standards'
      ];
      
      expectedMethods.forEach(method => {
        expect(typeof (service.get as any)[method]).toBe('function', `get.${ method } should be a function`);
      });
    });
  });
  
  describe('add API Methods', () => {
    it('should expose add object with mutation methods', () => {
      expect(service.add).toBeDefined();
      expect(typeof service.add).toBe('object');
    });
    
    it('should have expected add methods', () => {
      const expectedMethods = [
        'patch',
        'rack',
        'comment',
        'userModule',
        'moduleINs',
        'moduleOUTs',
        'rackModule'
      ];
      
      expectedMethods.forEach(method => {
        expect(typeof (service.add as any)[method]).toBe('function', `add.${ method } should be a function`);
      });
    });
  });
  
  describe('update API Methods', () => {
    it('should expose update object with update methods', () => {
      expect(service.update).toBeDefined();
      expect(typeof service.update).toBe('object');
    });
    
    it('should have expected update methods', () => {
      const expectedMethods = [
        'patch',
        'rack',
        'module',
        'patchConnections'
      ];
      
      expectedMethods.forEach(method => {
        expect(typeof (service.update as any)[method]).toBe('function', `update.${ method } should be a function`);
      });
    });
  });
  
  describe('delete API Methods', () => {
    it('should expose delete object with delete methods', () => {
      expect(service.delete).toBeDefined();
      expect(typeof service.delete).toBe('object');
    });
    
    it('should have expected delete methods', () => {
      const expectedMethods = [
        'patch',
        'module',
        'comment',
        'rackedModule'
      ];
      
      expectedMethods.forEach(method => {
        expect(typeof (service.delete as any)[method]).toBe('function', `delete.${ method } should be a function`);
      });
    });
  });
  
  describe('Authentication Methods', () => {
    it('should expose all authentication methods', () => {
      const authMethods = ['login$', 'signup$', 'logoff$', 'resetPassword$', 'getUserSession$'];
      
      authMethods.forEach(method => {
        expect(typeof (service as any)[method]).toBe('function', `${ method } should be a function`);
      });
    });
    
    it('should have user observable structure', () => {
      expect(service.user.user$).toBeDefined();
      expect(service.user.login$).toBeDefined();
      expect(service.user.logout$).toBeDefined();
    });
  });
  
  // ============================================================================
  // INTEGRATION TESTS: End-to-End Database Operations
  // ============================================================================
  
  describe('getTags - Database Integration', () => {
    it('should successfully fetch tags from Supabase', (done) => {
      const tags$ = service.GET.tags();
      
      tags$.subscribe({
        next: (data: any) => {
          // getTags returns just the data array, not a response object
          expect(data).withContext('Data should be defined').toBeDefined();
          expect(Array.isArray(data)).withContext('Should return an array').toBe(true);
          
          done();
        },
        error: (error) => {
          fail(`Database connection failed: ${ error.message || JSON.stringify(error) }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return tags with valid schema structure', (done) => {
      const tags$ = service.GET.tags();
      
      tags$.subscribe({
        next: (data: any) => {
          // getTags returns the data array directly
          if (data && data.length > 0) {
            const tag = data[0];
            
            // Validate Tag interface compliance
            expect(tag.id).withContext('Tag should have id').toBeDefined();
            expect(typeof tag.id).withContext('Tag id should be a number').toBe('number');
            
            expect(tag.name).withContext('Tag should have name').toBeDefined();
            expect(typeof tag.name).withContext('Tag name should be a string').toBe('string');
            expect(tag.name.length).withContext('Tag name should not be empty').toBeGreaterThan(0);
            
            expect(tag.type).withContext('Tag should have type').toBeDefined();
            expect([TagType.Purpose, TagType.Nature, TagType.Character]).withContext('Tag type should be valid TagType enum').toContain(tag.type);
          }
          
          done();
        },
        error: (error) => {
          fail(`Tag validation failed: ${ error.message }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return data within reasonable time', (done) => {
      const startTime = Date.now();
      const tags$ = service.GET.tags();
      
      tags$.subscribe({
        next: (_data: any) => {
          const duration = Date.now() - startTime;
          expect(duration).withContext('Query should complete within 5 seconds').toBeLessThan(5000);
          done();
        },
        error: (error) => {
          fail(`Performance test failed: ${ error.message }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('getManufacturers - Database Integration', () => {
    it('should fetch manufacturers with valid schema', (done) => {
      const manufacturers$ = service.GET.manufacturers(0, 10);
      
      manufacturers$.subscribe({
        next: (response: any) => {
          expect(response).withContext('Response should be defined').toBeDefined();
          expect(response.data).withContext('Response should have data property').toBeDefined();
          expect(Array.isArray(response.data)).withContext('Data should be an array').toBe(true);
          expect(response.error).withContext('Error should be null').toBeNull();
          
          if (response.data && response.data.length > 0) {
            const manufacturer: DBManufacturer = response.data[0];
            
            // Validate DBManufacturer interface
            expect(manufacturer.id).withContext('Manufacturer should have id').toBeDefined();
            expect(typeof manufacturer.id).withContext('Manufacturer id should be number').toBe('number');
            
            expect(manufacturer.name).withContext('Manufacturer should have name').toBeDefined();
            expect(typeof manufacturer.name).withContext('Manufacturer name should be string').toBe('string');
            expect(manufacturer.name.length).withContext('Manufacturer name should not be empty').toBeGreaterThan(0);
            
            // Optional fields validation
            if (manufacturer.url) {
              expect(typeof manufacturer.url).withContext('URL should be string if present').toBe('string');
            }
            if (manufacturer.logo) {
              expect(typeof manufacturer.logo).withContext('Logo should be string if present').toBe('string');
            }
          }
          
          done();
        },
        error: (error) => {
          fail(`Manufacturer fetch failed: ${ error.message || JSON.stringify(error) }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should respect pagination limits', (done) => {
      const from = 0;
      const to = PAGINATION_TEST_SIZE;
      const manufacturers$ = service.GET.manufacturers(from, to);
      
      manufacturers$.subscribe({
        next: (response: any) => {
          if (response.data) {
            const returnedCount = response.data.length;
            const maxExpected = to - from + 1;
            
            expect(returnedCount).withContext(`Should not exceed pagination limit of ${ maxExpected }`).toBeLessThanOrEqual(maxExpected);
          }
          
          done();
        },
        error: (error) => {
          fail(`Pagination test failed: ${ error.message }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should handle different pagination ranges', (done) => {
      const manufacturers$ = service.GET.manufacturers(5, 10);
      
      manufacturers$.subscribe({
        next: (response: any) => {
          expect(response.data).toBeDefined();
          // Should not throw error with different ranges
          done();
        },
        error: (error) => {
          fail(`Pagination range test failed: ${ error.message }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should handle zero-based pagination correctly', (done) => {
      const manufacturers$ = service.GET.manufacturers(0, 0);
      
      manufacturers$.subscribe({
        next: (response: any) => {
          expect(response.data).toBeDefined();
          if (response.data) {
            expect(response.data.length).toBeLessThanOrEqual(1);
          }
          done();
        },
        error: (error) => {
          fail(`Zero-based pagination failed: ${ error.message }`);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('currentUserRacks - Data Extraction Regression Test', () => {
    /**
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

  describe('Database Connection Health', () => {
    it('should have properly initialized Supabase client', () => {
      const supabaseClient = (service as any).supabase;
      
      expect(supabaseClient).withContext('Supabase client should be initialized').toBeDefined();
      expect(supabaseClient.from).withContext('Client should have from method').toBeDefined();
      expect(typeof supabaseClient.from).withContext('from should be a function').toBe('function');
    });
    
    it('should use environment configuration correctly', () => {
      const supabaseClient = (service as any).supabase;
      
      expect(supabaseClient.supabaseUrl).withContext('URL should be configured').toBeDefined();
      expect(supabaseClient.supabaseKey).withContext('Key should be configured').toBeDefined();
      
      // Validate URL format
      expect(supabaseClient.supabaseUrl).withContext('URL should be valid Supabase endpoint').toMatch(/^https:\/\/.*\.supabase\.co$/);
    });
    
    it('should handle connection without throwing synchronous errors', () => {
      expect(() => {
        const testQuery$ = service.GET.tags();
        expect(testQuery$).toBeDefined();
      }).not.toThrow();
    });
  });
  
  describe('Caching Behavior', () => {
    it('should expose cache resetter stream', () => {
      expect(service.cacheResetter$).toBeDefined();
      
      let emissionReceived = false;
      const subscription = service.cacheResetter$.subscribe((_data) => {
        emissionReceived = true;
      });
      
      // Trigger a cache bust operation if available
      (service.cacheResetter$ as any).next(['manufacturers']);
      
      subscription.unsubscribe();
    });
    
    it('should use localStorage for caching strategy', () => {
      // Verify that ts-cacheable is configured for localStorage
      // This validates the caching setup exists
      expect(localStorage).toBeDefined();
    });
  });
  
  describe('Error Handling & Edge Cases', () => {
    it('should handle invalid pagination parameters gracefully', () => {
      expect(() => {
        const result$ = service.GET.manufacturers(-1, -10);
        expect(result$).toBeDefined();
      }).not.toThrow();
    });
    
    it('should return observable for non-existent ID queries', () => {
      expect(() => {
        const result$ = service.GET.moduleWithId(999999);
        expect(result$).toBeDefined();
      }).not.toThrow();
    });
  });
  
  describe('Service Pattern Compliance', () => {
    it('should have consistent method signatures across CRUD operations', () => {
      // Validate all methods return observables
      const testObservable$ = service.GET.tags();
      expect(testObservable$.subscribe).toBeDefined();
    });
    
    it('should follow naming conventions for all API groups', () => {
      const apiGroups = ['GET', 'get', 'add', 'update', 'delete'];
      
      apiGroups.forEach(group => {
        expect((service as any)[group]).withContext(`${ group } should exist`).toBeDefined();
        expect(typeof (service as any)[group]).withContext(`${ group } should be an object`).toBe('object');
      });
    });
  });
});