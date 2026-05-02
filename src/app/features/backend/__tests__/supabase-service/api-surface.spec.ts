import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest
} from './test-setup';
import { SupabaseService } from '../../supabase.service';


/**
 * API Surface Tests
 *
 * Tests for API method availability, structure, and signatures.
 * Validates that all expected methods exist and return proper types.
 */
describe('SupabaseService - API Surface', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
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
        'applicationStatistics',
        'patchConnections',
        'currentUserComments',
        'patches',
        'publicPatchWithId',
        'rackWithId',
        'publicRackWithId',
        'racksMinimal',
        'userPatchesPaginated',
        'userRacksPaginated',
        'publicUserPatchesPaginated',
        'publicUserRacksPaginated'
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
        'standards',
        'tagVotesForModule',
        'myVotes',
        'allTags',
        'publicProfileByUsername'
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
        'userModuleTag',
        'moduleINs',
        'moduleOUTs',
        'rackModule',
        'moduleTagLink'
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
        'rackedModule',
        'userModuleTag'
      ];
      
      expectedMethods.forEach(method => {
        expect(typeof (service.delete as any)[method]).toBe('function', `delete.${ method } should be a function`);
      });
    });
  });
  
  describe('Authentication Methods', () => {
    it('should expose auth namespace with all authentication methods', () => {
      expect(service.auth).toBeDefined();
      const authMethods = ['login$', 'signup$', 'logoff$', 'resetPassword$', 'getUserSession$'];

      authMethods.forEach(method => {
        expect(typeof (service.auth as any)[method]).toBe('function', `auth.${ method } should be a function`);
      });
    });
    
    it('should have user observable structure', () => {
      expect(service.user.user$).toBeDefined();
      expect(service.user.login$).toBeDefined();
      expect(service.user.logout$).toBeDefined();
    });
  });
});
