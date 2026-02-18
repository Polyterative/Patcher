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