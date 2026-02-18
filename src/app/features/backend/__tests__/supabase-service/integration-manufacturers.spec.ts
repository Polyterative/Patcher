import {
  cleanupSupabaseServiceTest,
  PAGINATION_TEST_SIZE,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { SupabaseService } from '../../supabase.service';
import { DBManufacturer } from '../../../../models/manufacturer';


/**
 * Database Integration Tests - Manufacturers
 *
 * End-to-end tests for manufacturer retrieval from Supabase.
 * Validates pagination, data schema, and query parameters.
 */
describe('SupabaseService - getManufacturers Integration', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
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