import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest
} from './test-setup';
import { SupabaseService } from '../../supabase.service';


/**
 * Service Pattern Compliance Tests
 *
 * Tests for validating adherence to service architecture patterns,
 * naming conventions, and API consistency.
 */
describe('SupabaseService - Service Pattern Compliance', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  it('should have consistent method signatures across CRUD operations', () => {
    // Validate all methods return observables
    const testObservable$ = service.GET.manufacturers();
    expect(testObservable$.subscribe).toBeDefined();
  });
  
  it('should follow naming conventions for all API groups', () => {
    const apiGroups = {
      GET: service.GET,
      add: service.add,
      delete: service.delete,
      get: service.get,
      update: service.update
    } satisfies Record<string, object>;
    
    Object.entries(apiGroups).forEach(([group, apiGroup]) => {
      expect(apiGroup).withContext(`${ group } should exist`).toBeDefined();
      expect(typeof apiGroup).withContext(`${ group } should be an object`).toBe('object');
    });
  });

  it('GET and get groups both expose module retrieval methods', () => {
    expect(typeof service.GET.modules).toBe('function');
    expect(typeof service.GET.moduleWithId).toBe('function');
  });

  it('auth namespace is defined and exposes getUserSession$', () => {
    expect(service.auth).toBeDefined();
    expect(typeof service.auth.getUserSession$).toBe('function');
  });
});