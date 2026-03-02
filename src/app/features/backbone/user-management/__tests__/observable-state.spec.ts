import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  cleanupComponentTest,
  MOCK_RICH_USER,
  MOCK_SIMPLE_USER,
  setupComponentTest
} from './test-setup';
import { UserManagementComponent } from '../user-management.component';


/**
 * Observable State Tests
 *
 * Covers: loggedUser$, loggedUserFullProfile$, showPasswordForm$
 * as observed from the component's perspective — i.e. that the
 * component correctly reflects state pushed by the service.
 */
describe('UserManagementComponent - Observable State', () => {
  let component: UserManagementComponent;
  let mockUserManagementService: any;
  
  beforeEach(() => {
    const setup = setupComponentTest();
    component = setup.component;
    mockUserManagementService = setup.mockUserManagementService;
  });
  
  afterEach(() => cleanupComponentTest());
  
  // ─── loggedUser$ ──────────────────────────────────────────────────────────
  
  describe('loggedUser$ stream', () => {
    it('should initially emit undefined', fakeAsync(() => {
      let value: any = 'NOT_SET';
      component.userManagementService.loggedUser$.subscribe(v => (value = v));
      tick();
      expect(value).toBeUndefined();
    }));
    
    it('should reflect a logged-in user when service pushes one', fakeAsync(() => {
      let value: any;
      component.userManagementService.loggedUser$.subscribe(v => (value = v));
      
      mockUserManagementService._loggedUser$.next(MOCK_SIMPLE_USER);
      tick();
      
      expect(value).toEqual(MOCK_SIMPLE_USER);
    }));
    
    it('should reflect undefined after user logs out', fakeAsync(() => {
      let value: any;
      component.userManagementService.loggedUser$.subscribe(v => (value = v));
      
      mockUserManagementService._loggedUser$.next(MOCK_SIMPLE_USER);
      tick();
      mockUserManagementService._loggedUser$.next(undefined);
      tick();
      
      expect(value).toBeUndefined();
    }));
  });
  
  // ─── loggedUserFullProfile$ ───────────────────────────────────────────────
  
  describe('loggedUserFullProfile$ stream', () => {
    it('should initially emit undefined', fakeAsync(() => {
      let value: any = 'NOT_SET';
      component.userManagementService.loggedUserFullProfile$.subscribe(v => (value = v));
      tick();
      expect(value).toBeUndefined();
    }));
    
    it('should reflect the full user profile when service pushes one', fakeAsync(() => {
      let value: any;
      component.userManagementService.loggedUserFullProfile$.subscribe(v => (value = v));
      
      mockUserManagementService._loggedUserFullProfile$.next(MOCK_RICH_USER);
      tick();
      
      expect(value).toEqual(MOCK_RICH_USER);
      expect(value.username).toBe('testuser');
      expect(value.email).toBe('test@example.com');
      expect(value.id).toBe('test-user-id-123');
    }));
    
    it('should emit the updated profile after a username change', fakeAsync(() => {
      const updatedProfile = {...MOCK_RICH_USER, username: 'renameduser'};
      let value: any;
      component.userManagementService.loggedUserFullProfile$.subscribe(v => (value = v));
      
      mockUserManagementService._loggedUserFullProfile$.next(MOCK_RICH_USER);
      tick();
      mockUserManagementService._loggedUserFullProfile$.next(updatedProfile);
      tick();
      
      expect(value.username).toBe('renameduser');
    }));
  });
  
  // ─── showPasswordForm$ ────────────────────────────────────────────────────
  
  describe('showPasswordForm$ stream', () => {
    it('should initially be false', fakeAsync(() => {
      let value: boolean | undefined;
      component.userManagementService.showPasswordForm$.subscribe(v => (value = v));
      tick();
      expect(value).toBe(false);
    }));
    
    it('should become true when togglePasswordForm$ emits true', fakeAsync(() => {
      let value: boolean | undefined;
      component.userManagementService.showPasswordForm$.subscribe(v => (value = v));
      
      mockUserManagementService._showPasswordForm$.next(true);
      tick();
      
      expect(value).toBe(true);
    }));
    
    it('should revert to false when togglePasswordForm$ emits false', fakeAsync(() => {
      let value: boolean | undefined;
      component.userManagementService.showPasswordForm$.subscribe(v => (value = v));
      
      mockUserManagementService._showPasswordForm$.next(true);
      tick();
      mockUserManagementService._showPasswordForm$.next(false);
      tick();
      
      expect(value).toBe(false);
    }));
  });
});