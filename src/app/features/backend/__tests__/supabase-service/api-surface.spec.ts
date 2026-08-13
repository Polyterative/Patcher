import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest
} from './test-setup';
import { SupabaseService } from '../../supabase.service';


type NamespaceMethod<TNamespace extends object> = Extract<keyof TNamespace, string>;

function expectNamespaceMethods<TNamespace extends object>(
  namespace: TNamespace,
  label: string,
  methods: readonly NamespaceMethod<TNamespace>[]
): void {
  methods.forEach(method => {
    expect(typeof namespace[method]).toBe('function', `${ label }.${ method } should be a function`);
  });
}

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
        'publicModuleImportCandidates',
        'manufacturers',
        'currentUserModules',
        'comments',
        'moduleWithId',
        'applicationStatistics',
        'applicationInsightsSnapshot',
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
        'publicUserRacksPaginated',
        'activeMarketplaceListings',
        'marketplaceListingByPublicId'
      ] satisfies readonly NamespaceMethod<SupabaseService['GET']>[];
      
      expectNamespaceMethods(service.GET, 'GET', expectedMethods);
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
        'moduleUsageSummary',
        'userModuleAcquisitionsForModule',
        'currentUserShippingAddresses',
        'currentUserMarketplaceListings',
        'standards',
        'tagVotesForModule',
        'myVotes',
        'allTags',
        'publicProfileByUsername'
      ] satisfies readonly NamespaceMethod<SupabaseService['get']>[];
      
      expectNamespaceMethods(service.get, 'get', expectedMethods);
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
        'userModuleAcquisition',
        'shippingAddress',
        'marketplaceListing',
        'marketplaceListingMedia',
        'userModuleTag',
        'moduleINs',
        'moduleOUTs',
        'rackModule',
        'moduleTagLink'
      ] satisfies readonly NamespaceMethod<SupabaseService['add']>[];
      
      expectNamespaceMethods(service.add, 'add', expectedMethods);
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
        'patchConnections',
        'userModuleAcquisition',
        'shippingAddress',
        'marketplaceListing',
        'marketplaceListingMediaOrder'
      ] satisfies readonly NamespaceMethod<SupabaseService['update']>[];
      
      expectNamespaceMethods(service.update, 'update', expectedMethods);
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
        'userModuleTag',
        'userModuleAcquisition',
        'shippingAddress',
        'marketplaceListing',
        'marketplaceListingMedia'
      ] satisfies readonly NamespaceMethod<SupabaseService['delete']>[];
      
      expectNamespaceMethods(service.delete, 'delete', expectedMethods);
    });
  });

  describe('merge API Methods', () => {
    it('should expose merge object with mutation methods', () => {
      expect(service.merge).toBeDefined();
      expect(typeof service.merge).toBe('object');
      expect(typeof service.merge.moduleInto).toBe('function');
    });
  });
  
  describe('Authentication Methods', () => {
    it('should expose auth namespace with all authentication methods', () => {
      expect(service.auth).toBeDefined();
      const authMethods = [
        'login$',
        'signup$',
        'logoff$',
        'resetPassword$',
        'getUserSession$'
      ] satisfies readonly NamespaceMethod<SupabaseService['auth']>[];

      expectNamespaceMethods(service.auth, 'auth', authMethods);
    });
    
    it('should have user observable structure', () => {
      expect(service.user.user$).toBeDefined();
      expect(service.user.login$).toBeDefined();
      expect(service.user.logout$).toBeDefined();
    });
  });
});
