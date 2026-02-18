import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import { SupabaseService } from '../../supabase.service';
import { TagType } from '../../../../models/tag';


/**
 * Database Integration Tests - Tags
 *
 * End-to-end tests for tag retrieval from Supabase.
 * Validates database connectivity, data schema, and performance.
 */
describe('SupabaseService - getTags Integration', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
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