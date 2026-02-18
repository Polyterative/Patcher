import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest
} from './test-setup';
import { SupabaseService } from '../../supabase.service';


/**
 * Database Connection Health Tests
 *
 * Tests for validating the Supabase client configuration,
 * connection setup, and environment configuration.
 */
describe('SupabaseService - Database Connection Health', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
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