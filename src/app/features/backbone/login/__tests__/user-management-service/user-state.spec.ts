import {
  cleanupUserManagementServiceTest,
  MOCK_RICH_USER,
  MOCK_RICH_USER_2,
  MOCK_SIMPLE_USER,
  MOCK_SIMPLE_USER_2,
  setupUserManagementServiceTest
} from './test-setup';
import { UserManagementService } from '../../user-management.service';
import { of } from 'rxjs';
import {
  fakeAsync,
  tick
} from '@angular/core/testing';


/**
 * User State Management Tests
 *
 * Tests for user session management, profile loading, and state tracking.
 */
describe('UserManagementService - User State Management', () => {
  let service: UserManagementService;
  let mockSupabaseService: any;
  let mockUserDataHandlerService: any;
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
    mockSupabaseService = setup.mockSupabaseService;
    mockUserDataHandlerService = setup.mockUserDataHandlerService;
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  it('should update currentUserId when loggedUser$ changes', fakeAsync(() => {
    // Arrange
    expect((service as any).currentUserId).toBeUndefined();
    
    // Act
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Assert
    expect((service as any).currentUserId).toBe(MOCK_SIMPLE_USER.id);
  }));
  
  it('should clear currentUserId when user logs out', fakeAsync(() => {
    // Arrange
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    tick();
    expect((service as any).currentUserId).toBe(MOCK_SIMPLE_USER.id);
    
    // Act
    service.loggedUser$.next(undefined);
    tick();
    
    // Assert
    expect((service as any).currentUserId).toBeUndefined();
  }));
  
  it('should fetch rich user profile when loggedUser$ is set', fakeAsync(() => {
    // Arrange
    mockSupabaseService.getRichUserSession$.and.returnValue(of(MOCK_RICH_USER));
    
    let richProfile: any;
    service.loggedUserFullProfile$.subscribe(profile => richProfile = profile);
    
    tick();
    
    // Act
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Assert
    expect(mockSupabaseService.getRichUserSession$).toHaveBeenCalled();
    expect(richProfile).toEqual(MOCK_RICH_USER);
  }));
  
  it('should update userBoxService when rich profile is loaded', fakeAsync(() => {
    // Arrange
    mockSupabaseService.getRichUserSession$.and.returnValue(of(MOCK_RICH_USER));
    
    let userBoxUser: any;
    mockUserDataHandlerService.store.user$.subscribe((user: any) => userBoxUser = user);
    
    tick();
    
    // Act
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Assert
    expect(userBoxUser).toEqual({username: MOCK_RICH_USER.username});
  }));
  
  it('should clear userBoxService username when profile is undefined', fakeAsync(() => {
    // Arrange
    mockSupabaseService.getRichUserSession$.and.returnValue(of(MOCK_RICH_USER));
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    let userBoxUser: any;
    mockUserDataHandlerService.store.user$.subscribe((user: any) => userBoxUser = user);
    
    // Act
    service.loggedUserFullProfile$.next(undefined);
    
    tick();
    
    // Assert
    expect(userBoxUser).toEqual({username: undefined});
  }));
  
  it('should NOT refetch profile when loggedUser$ changes to same user', fakeAsync(() => {
    // Arrange - Set up a profile for the user
    service.loggedUserFullProfile$.next(MOCK_RICH_USER);
    
    let richProfile: any = MOCK_RICH_USER;
    service.loggedUserFullProfile$.subscribe(profile => richProfile = profile);
    
    tick();
    
    mockSupabaseService.getRichUserSession$.calls.reset();
    
    // Act - Set loggedUser$ to the same user (MOCK_SIMPLE_USER has same ID as MOCK_RICH_USER)
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Assert: Profile should remain unchanged and no refetch should occur
    // This prevents flashing during login when we already have the profile
    expect(richProfile).toEqual(MOCK_RICH_USER);
    expect(mockSupabaseService.getRichUserSession$).not.toHaveBeenCalled();
  }));
  
  it('should fetch new profile when loggedUser$ changes to different user', fakeAsync(() => {
    // Arrange - Set up a profile for first user
    service.loggedUserFullProfile$.next(MOCK_RICH_USER);
    
    let richProfile: any = MOCK_RICH_USER;
    service.loggedUserFullProfile$.subscribe(profile => richProfile = profile);
    
    tick();
    
    mockSupabaseService.getRichUserSession$.calls.reset();
    mockSupabaseService.getRichUserSession$.and.returnValue(of(MOCK_RICH_USER_2));
    
    // Act - Switch to a different user (different ID)
    service.loggedUser$.next(MOCK_SIMPLE_USER_2);
    
    tick();
    
    // Assert: Should fetch the new user's profile
    expect(mockSupabaseService.getRichUserSession$).toHaveBeenCalled();
    expect(richProfile).toEqual(MOCK_RICH_USER_2);
  }));
  
  it('should NOT fetch rich profile when user is undefined', fakeAsync(() => {
    // Arrange
    mockSupabaseService.getRichUserSession$.calls.reset();
    
    // Act
    service.loggedUser$.next(undefined);
    
    tick();
    
    // Assert
    expect(mockSupabaseService.getRichUserSession$).not.toHaveBeenCalled();
  }));
  
  it('should filter out rich profiles without username', fakeAsync(() => {
    // Arrange
    const invalidProfile = {...MOCK_RICH_USER, username: ''};
    mockSupabaseService.getRichUserSession$.and.returnValue(of(invalidProfile));
    
    let richProfile: any;
    service.loggedUserFullProfile$.subscribe(profile => richProfile = profile);
    
    tick();
    
    // Act
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Assert: Should be filtered out
    expect(richProfile).toBeUndefined();
  }));
  
  it('should filter out rich profiles without email', fakeAsync(() => {
    // Arrange
    const invalidProfile = {...MOCK_RICH_USER, email: ''};
    mockSupabaseService.getRichUserSession$.and.returnValue(of(invalidProfile));
    
    let richProfile: any;
    service.loggedUserFullProfile$.subscribe(profile => richProfile = profile);
    
    tick();
    
    // Act
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Assert: Should be filtered out
    expect(richProfile).toBeUndefined();
  }));
});