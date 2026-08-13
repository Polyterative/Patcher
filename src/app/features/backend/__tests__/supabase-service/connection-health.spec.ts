import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest
} from './test-setup';
import { getSupabaseClientDouble } from './supabase-query-test-doubles';
import { SupabaseService } from '../../supabase.service';


type GetMethod = Extract<keyof SupabaseService['GET'], string>;

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
    const supabaseClient = getSupabaseClientDouble(service);
    
    expect(supabaseClient).withContext('Supabase client should be initialized').toBeDefined();
    expect(supabaseClient.from).withContext('Client should have from method').toBeDefined();
    expect(typeof supabaseClient.from).withContext('from should be a function').toBe('function');
  });
  
  it('should use environment configuration correctly', () => {
    const supabaseClient = getSupabaseClientDouble(service);
    
    expect(supabaseClient.supabaseUrl).withContext('URL should be configured').toBeDefined();
    expect(supabaseClient.supabaseKey).withContext('Key should be configured').toBeDefined();
    
    // Validate URL format
    expect(supabaseClient.supabaseUrl).withContext('URL should be valid Supabase endpoint').toMatch(/^https:\/\/.*\.supabase\.co$/);
  });
  
  it('should handle connection without throwing synchronous errors', () => {
    expect(() => {
      const testQuery$ = service.GET.manufacturers();
      expect(testQuery$).toBeDefined();
    }).not.toThrow();
  });

  it('GET group exposes known query methods', () => {
    const methods = [
      'modules',
      'patches',
      'manufacturers',
      'comments'
    ] satisfies readonly GetMethod[];

    methods.forEach(method => {
      expect(typeof service.GET[method])
        .withContext(`GET.${method} should be a function`)
        .toBe('function');
    });
  });
});