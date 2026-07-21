import {
  cleanupUserManagementServiceTest,
  MOCK_RICH_USER,
  MOCK_RICH_USER_2,
  MOCK_SIMPLE_USER,
  MOCK_SIMPLE_USER_2,
  setupUserManagementServiceTest
} from './test-setup';
import type {
  MockSupabaseService,
  MockUserDataHandlerService
} from './test-setup';
import { UserManagementService } from '../../user-management.service';
import { of } from 'rxjs';
import type { ReplaySubject } from 'rxjs';
import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import type {
  RichUserModel,
  SimpleUserModel
} from '../../../../backend/supabase.types';

type UserBoxUser = {
  username?: string;
};

type UserStateServiceInternals = {
  currentUserId: string | undefined;
  _loggedUser$: ReplaySubject<SimpleUserModel | undefined>;
  _loggedUserFullProfile$: ReplaySubject<RichUserModel | undefined>;
};

function userStateInternals(service: UserManagementService): UserStateServiceInternals {
  return service as unknown as UserStateServiceInternals;
}


/**
 * User State Management Tests
 *
 * Tests for user session management, profile loading, and state tracking.
 */
describe('UserManagementService - User State Management', () => {
  let service: UserManagementService;
  let mockSupabaseService: MockSupabaseService;
  let mockUserDataHandlerService: MockUserDataHandlerService;
  
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
    const internals = userStateInternals(service);
    expect(internals.currentUserId).toBeUndefined();
    
    // Act
    internals._loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Assert
    expect(internals.currentUserId).toBe(MOCK_SIMPLE_USER.id);
  }));
  
  it('should clear currentUserId when user logs out', fakeAsync(() => {
    // Arrange
    const internals = userStateInternals(service);
    internals._loggedUser$.next(MOCK_SIMPLE_USER);
    tick();
    expect(internals.currentUserId).toBe(MOCK_SIMPLE_USER.id);
    
    // Act
    internals._loggedUser$.next(undefined);
    tick();
    
    // Assert
    expect(internals.currentUserId).toBeUndefined();
  }));
  
  it('should fetch rich user profile when loggedUser$ is set', fakeAsync(() => {
    // Arrange
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of(MOCK_RICH_USER));
    
    let richProfile: RichUserModel | undefined;
    service.loggedUserFullProfile$.subscribe(profile => richProfile = profile);
    
    tick();
    
    // Act
    userStateInternals(service)._loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Assert
    expect(mockSupabaseService.auth.getRichUserSession$).toHaveBeenCalled();
    expect(richProfile).toEqual(MOCK_RICH_USER);
  }));
  
  it('should update userBoxService when rich profile is loaded', fakeAsync(() => {
    // Arrange
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of(MOCK_RICH_USER));
    
    let userBoxUser: UserBoxUser | undefined;
    mockUserDataHandlerService.store.user$.subscribe(user => userBoxUser = user);
    
    tick();
    
    // Act
    userStateInternals(service)._loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Assert
    expect(userBoxUser).toEqual({username: MOCK_RICH_USER.username});
  }));
  
  it('should clear userBoxService username when profile is undefined', fakeAsync(() => {
    // Arrange
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of(MOCK_RICH_USER));
    const internals = userStateInternals(service);
    internals._loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    let userBoxUser: UserBoxUser | undefined;
    mockUserDataHandlerService.store.user$.subscribe(user => userBoxUser = user);
    
    // Act
    internals._loggedUserFullProfile$.next(undefined);
    
    tick();
    
    // Assert
    expect(userBoxUser).toEqual({username: undefined});
  }));
  
  it('should NOT refetch profile when loggedUser$ changes to same user', fakeAsync(() => {
    // Arrange - Set up a profile for the user
    const internals = userStateInternals(service);
    internals._loggedUserFullProfile$.next(MOCK_RICH_USER);
    
    let richProfile: RichUserModel | undefined = MOCK_RICH_USER;
    service.loggedUserFullProfile$.subscribe(profile => richProfile = profile);
    
    tick();
    
    mockSupabaseService.auth.getRichUserSession$.calls.reset();
    
    // Act - Set loggedUser$ to the same user (MOCK_SIMPLE_USER has same ID as MOCK_RICH_USER)
    internals._loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Assert: Profile should remain unchanged and no refetch should occur
    // This prevents flashing during login when we already have the profile
    expect(richProfile).toEqual(MOCK_RICH_USER);
    expect(mockSupabaseService.auth.getRichUserSession$).not.toHaveBeenCalled();
  }));
  
  it('should fetch new profile when loggedUser$ changes to different user', fakeAsync(() => {
    // Arrange - Set up a profile for first user
    const internals = userStateInternals(service);
    internals._loggedUserFullProfile$.next(MOCK_RICH_USER);
    
    let richProfile: RichUserModel | undefined = MOCK_RICH_USER;
    service.loggedUserFullProfile$.subscribe(profile => richProfile = profile);
    
    tick();
    
    mockSupabaseService.auth.getRichUserSession$.calls.reset();
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of(MOCK_RICH_USER_2));
    
    // Act - Switch to a different user (different ID)
    internals._loggedUser$.next(MOCK_SIMPLE_USER_2);
    
    tick();
    
    // Assert: Should fetch the new user's profile
    expect(mockSupabaseService.auth.getRichUserSession$).toHaveBeenCalled();
    expect(richProfile).toEqual(MOCK_RICH_USER_2);
  }));
  
  it('should NOT fetch rich profile when user is undefined', fakeAsync(() => {
    // Arrange
    mockSupabaseService.auth.getRichUserSession$.calls.reset();
    
    // Act
    userStateInternals(service)._loggedUser$.next(undefined);
    
    tick();
    
    // Assert
    expect(mockSupabaseService.auth.getRichUserSession$).not.toHaveBeenCalled();
  }));
  
  it('should filter out rich profiles without username', fakeAsync(() => {
    // Arrange
    const invalidProfile = {...MOCK_RICH_USER, username: ''};
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of(invalidProfile));
    
    let richProfile: RichUserModel | undefined;
    service.loggedUserFullProfile$.subscribe(profile => richProfile = profile);
    
    tick();
    
    // Act
    userStateInternals(service)._loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Assert: Should be filtered out
    expect(richProfile).toBeUndefined();
  }));
  
  it('should filter out rich profiles without email', fakeAsync(() => {
    // Arrange
    const invalidProfile = {...MOCK_RICH_USER, email: ''};
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of(invalidProfile));
    
    let richProfile: RichUserModel | undefined;
    service.loggedUserFullProfile$.subscribe(profile => richProfile = profile);
    
    tick();
    
    // Act
    userStateInternals(service)._loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Assert: Should be filtered out
    expect(richProfile).toBeUndefined();
  }));
});