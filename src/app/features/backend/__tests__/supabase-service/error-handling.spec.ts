import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest
} from './test-setup';
import { SupabaseService } from '../../supabase.service';


/**
 * Error Handling & Edge Cases Tests
 *
 * Tests for validating error handling, edge cases,
 * and graceful degradation.
 */
describe('SupabaseService - Error Handling & Edge Cases', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
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