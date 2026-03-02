import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  BehaviorSubject,
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import { UserManagementComponent } from '../user-management.component';
import { UserManagementService } from '../../login/user-management.service';
import { SeoAndUtilsService } from '../../seo-and-utils.service';


/**
 * Shared mock user data for component tests
 */
export const MOCK_SIMPLE_USER = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  created_at: '2024-01-15T10:00:00.000Z',
  updated_at: '2024-01-15T10:00:00.000Z'
};

export const MOCK_RICH_USER = {
  ...MOCK_SIMPLE_USER,
  username: 'testuser'
};

/**
 * Creates a mock UserManagementService with all required observables and subjects
 */
export function createMockUserManagementService() {
  const loggedUser$ = new ReplaySubject<any>(1);
  const loggedUserFullProfile$ = new ReplaySubject<any>(1);
  const showPasswordForm$ = new BehaviorSubject<boolean>(false);
  const togglePasswordForm$ = new Subject<boolean>();
  const changePassword$ = new Subject<{
    newPassword: string
  }>();
  const deleteAccountAction$ = new Subject<void>();
  
  loggedUser$.next(undefined);
  loggedUserFullProfile$.next(undefined);
  
  return {
    loggedUser$: loggedUser$.asObservable(),
    loggedUserFullProfile$: loggedUserFullProfile$.asObservable(),
    showPasswordForm$: showPasswordForm$.asObservable(),
    togglePasswordForm$,
    changePassword$,
    deleteAccountAction$,
    logoff$: jasmine.createSpy('logoff$'),
    updateUsername$: jasmine.createSpy('updateUsername$').and.returnValue(of(void 0)),
    // internal subjects exposed for test control
    _loggedUser$: loggedUser$,
    _loggedUserFullProfile$: loggedUserFullProfile$,
    _showPasswordForm$: showPasswordForm$,
  };
}

/**
 * Creates a mock SeoAndUtilsService
 */
export function createMockSeoAndUtilsService() {
  return {
    updateSeo: jasmine.createSpy('updateSeo')
  };
}

/**
 * Configures TestBed for UserManagementComponent unit tests (no template rendering).
 * Returns the component instance and mocks.
 */
export function setupComponentTest(ignoreSeo = false) {
  const mockUserManagementService = createMockUserManagementService();
  const mockSeoAndUtilsService = createMockSeoAndUtilsService();
  
  TestBed.configureTestingModule({
    imports: [ReactiveFormsModule, NoopAnimationsModule],
    providers: [
      UserManagementComponent,
      {provide: UserManagementService, useValue: mockUserManagementService},
      {provide: SeoAndUtilsService, useValue: mockSeoAndUtilsService}
    ]
  });
  
  const component = TestBed.inject(UserManagementComponent);
  component.ignoreSeo = ignoreSeo;
  component.ngOnInit();
  
  return {
    component,
    mockUserManagementService,
    mockSeoAndUtilsService
  };
}

export function cleanupComponentTest() {
  TestBed.resetTestingModule();
}