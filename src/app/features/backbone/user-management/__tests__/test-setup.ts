import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  BehaviorSubject,
  Observable,
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import {
  RichUserModel,
  SimpleUserModel
} from '../../../backend/supabase.types';
import { SeoSocialShareData } from '../../../../models/seo.model';
import { UserManagementComponent } from '../user-management.component';
import { UserManagementService } from '../../login/user-management.service';
import { SeoAndUtilsService } from '../../seo-and-utils.service';


/**
 * Shared mock user data for component tests
 */
export const MOCK_SIMPLE_USER: SimpleUserModel = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  created_at: '2024-01-15T10:00:00.000Z',
  updated_at: '2024-01-15T10:00:00.000Z'
};

export const MOCK_RICH_USER: RichUserModel = {
  ...MOCK_SIMPLE_USER,
  username: 'testuser'
};

export type PasswordChangeAction = {
  newPassword: string
};

export type MockUserManagementService =
  Pick<UserManagementService,
    | 'loggedUser$'
    | 'loggedUserFullProfile$'
    | 'showUsernameForm$'
    | 'toggleUsernameForm$'
    | 'updateUsernameAction$'
    | 'showPasswordForm$'
    | 'togglePasswordForm$'
    | 'changePassword$'
    | 'resetUserDataAction$'
    | 'deleteAccountAction$'
    | 'logoff$'
    | 'isUsernameAvailable$'
    | 'updateUsername$'
  >
  & {
  logoff$: jasmine.Spy<() => void>;
  isUsernameAvailable$: jasmine.Spy<(username: string) => Observable<boolean>>;
  updateUsername$: jasmine.Spy<(username: string) => Observable<void>>;
  _loggedUser$: ReplaySubject<SimpleUserModel | undefined>;
  _loggedUserFullProfile$: ReplaySubject<RichUserModel | undefined>;
  _showUsernameForm$: BehaviorSubject<boolean>;
  _showPasswordForm$: BehaviorSubject<boolean>;
};

export type MockSeoAndUtilsService =
  Pick<SeoAndUtilsService, 'updateSeo'>
  & {
  updateSeo: jasmine.Spy<(data: SeoSocialShareData, appArea: string) => void>;
};

export interface UserManagementComponentTestSetup {
  component: UserManagementComponent;
  mockUserManagementService: MockUserManagementService;
  mockSeoAndUtilsService: MockSeoAndUtilsService;
}

/**
 * Creates a mock UserManagementService with all required observables and subjects
 */
export function createMockUserManagementService(): MockUserManagementService {
  const loggedUser$ = new ReplaySubject<SimpleUserModel | undefined>(1);
  const loggedUserFullProfile$ = new ReplaySubject<RichUserModel | undefined>(1);
  const showUsernameForm$ = new BehaviorSubject<boolean>(false);
  const toggleUsernameForm$ = new Subject<boolean>();
  const updateUsernameAction$ = new Subject<string>();
  const showPasswordForm$ = new BehaviorSubject<boolean>(false);
  const togglePasswordForm$ = new Subject<boolean>();
  const changePassword$ = new Subject<PasswordChangeAction>();
  const resetUserDataAction$ = new Subject<void>();
  const deleteAccountAction$ = new Subject<void>();
  const logoff$ = jasmine.createSpy<() => void>('logoff$');
  const isUsernameAvailable$ = jasmine
    .createSpy<(username: string) => Observable<boolean>>('isUsernameAvailable$')
    .and.returnValue(of(true));
  const updateUsername$ = jasmine
    .createSpy<(username: string) => Observable<void>>('updateUsername$')
    .and.returnValue(of(void 0));
  
  loggedUser$.next(undefined);
  loggedUserFullProfile$.next(undefined);
  
  return {
    loggedUser$: loggedUser$.asObservable(),
    loggedUserFullProfile$: loggedUserFullProfile$.asObservable(),
    showUsernameForm$: showUsernameForm$.asObservable(),
    toggleUsernameForm$,
    updateUsernameAction$,
    showPasswordForm$: showPasswordForm$.asObservable(),
    togglePasswordForm$,
    changePassword$,
    resetUserDataAction$,
    deleteAccountAction$,
    logoff$,
    isUsernameAvailable$,
    updateUsername$,
    // internal subjects exposed for test control
    _loggedUser$: loggedUser$,
    _loggedUserFullProfile$: loggedUserFullProfile$,
    _showUsernameForm$: showUsernameForm$,
    _showPasswordForm$: showPasswordForm$,
  };
}

/**
 * Creates a mock SeoAndUtilsService
 */
export function createMockSeoAndUtilsService(): MockSeoAndUtilsService {
  return {
    updateSeo: jasmine.createSpy<(data: SeoSocialShareData, appArea: string) => void>('updateSeo')
  };
}

/**
 * Configures TestBed for UserManagementComponent unit tests (no template rendering).
 * Returns the component instance and mocks.
 */
export function setupComponentTest(ignoreSeo = false): UserManagementComponentTestSetup {
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
