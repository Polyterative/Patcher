import {
  cleanupUserManagementServiceTest,
  setupUserManagementServiceTest
} from './test-setup';
import { UserManagementService } from '../../user-management.service';


/**
 * Service Initialization Tests
 *
 * Tests for basic service creation, dependency injection,
 * and initial configuration.
 */
describe('UserManagementService - Initialization', () => {
  let service: UserManagementService;
  let mockSnackBar: any;
  let mockRouter: any;
  let mockSupabaseService: any;
  let mockUserDataHandlerService: any;
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
    mockSnackBar = setup.mockSnackBar;
    mockRouter = setup.mockRouter;
    mockSupabaseService = setup.mockSupabaseService;
    mockUserDataHandlerService = setup.mockUserDataHandlerService;
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  it('should be created successfully', () => {
    expect(service).toBeTruthy();
    expect(service).toBeInstanceOf(UserManagementService);
  });
  
  it('should inject dependencies correctly', () => {
    expect(service.snackBar).toBe(mockSnackBar);
    expect(service.router).toBe(mockRouter);
    expect(service.backend).toBe(mockSupabaseService);
    expect(service.userBoxService).toBe(mockUserDataHandlerService);
  });
  
  it('should initialize loggedUser$ ReplaySubject', () => {
    expect(service.loggedUser$).toBeDefined();
    expect(typeof service.loggedUser$.subscribe).toBe('function');
  });
  
  it('should initialize loggedUserFullProfile$ ReplaySubject', () => {
    expect(service.loggedUserFullProfile$).toBeDefined();
    expect(typeof service.loggedUserFullProfile$.subscribe).toBe('function');
  });
  
  it('should have currentUserId initially undefined', () => {
    expect((service as any).currentUserId).toBeUndefined();
  });
  
  it('should extend SubManager', () => {
    expect((service as any).destroy$).toBeDefined();
    expect(typeof service.ngOnDestroy).toBe('function');
  });
  
  it('should call checkUserInCookies on initialization', (done) => {
    // If getUserSession$ was called, checkUserInCookies was executed
    // We need to wait a tick for the async operation
    setTimeout(() => {
      expect(mockSupabaseService.getUserSession$).toHaveBeenCalled();
      done();
    }, 100);
  });
});