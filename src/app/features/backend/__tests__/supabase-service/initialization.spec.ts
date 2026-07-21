import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest
} from './test-setup';
import { SupabaseService } from '../../supabase.service';
import type { SupabaseServiceTestSetup } from './test-setup';
import { getSupabaseClientDouble } from './supabase-query-test-doubles';


/**
 * Service Initialization Tests
 *
 * Tests for basic service creation, dependency injection,
 * and initial configuration.
 */
describe('SupabaseService - Initialization', () => {
  let service: SupabaseService;
  let mockSnackBar: SupabaseServiceTestSetup['mockSnackBar'];
  let mockActivatedRoute: SupabaseServiceTestSetup['mockActivatedRoute'];
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    mockSnackBar = setup.mockSnackBar;
    mockActivatedRoute = setup.mockActivatedRoute;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should be created successfully', () => {
    expect(service).toBeTruthy();
    expect(service).toBeInstanceOf(SupabaseService);
  });
  
  it('should inject dependencies correctly', () => {
    expect(service.snackBar).toBe(mockSnackBar);
    expect(service.activated).toBe(mockActivatedRoute);
  });
  
  it('should initialize Supabase client', () => {
    const supabaseClient = getSupabaseClientDouble(service);
    expect(supabaseClient).toBeDefined();
    expect(supabaseClient.from).toBeDefined();
    expect(typeof supabaseClient.from).toBe('function');
  });
  
  it('should have valid Supabase configuration', () => {
    const supabaseClient = getSupabaseClientDouble(service);
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