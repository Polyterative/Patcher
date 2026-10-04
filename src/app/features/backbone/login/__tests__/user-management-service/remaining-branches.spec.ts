import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  of,
  throwError
} from 'rxjs';
import { AuthApiError } from '@supabase/supabase-js';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../../user-management.service';
import {
  RichUserModel,
  SimpleUserModel
} from 'src/app/features/backend/supabase.service';
import { SupabaseSignupResult } from 'src/app/features/backend/supabase.types';
import { PasswordResetError } from 'src/app/features/backend/supabase-auth.helpers';
import {
  cleanupUserManagementServiceTest,
  createConfirmDialogRef,
  invokeCheckUserInCookies,
  MOCK_RICH_USER,
  MOCK_SIMPLE_USER,
  publishRichProfile,
  setupUserManagementServiceTest
} from './test-setup';


describe('UserManagementService - Remaining Branches', () => {
  type UserManagementServiceTestSetup = ReturnType<typeof setupUserManagementServiceTest>;

  let service: UserManagementService;
  let mockSupabaseService: UserManagementServiceTestSetup['mockSupabaseService'];
  let mockDialog: UserManagementServiceTestSetup['mockDialog'];
  let mockRouter: UserManagementServiceTestSetup['mockRouter'];
  let mockSnackBar: UserManagementServiceTestSetup['mockSnackBar'];
  let mockAnalytics: UserManagementServiceTestSetup['mockAnalytics'];
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
    mockSupabaseService = setup.mockSupabaseService;
    mockDialog = setup.mockDialog;
    mockRouter = setup.mockRouter;
    mockSnackBar = setup.mockSnackBar;
    mockAnalytics = setup.mockAnalytics;
    mockDialog.open.and.returnValue(createConfirmDialogRef({answer: true}));
    mockSupabaseService.delete.allUserData.and.returnValue(of(void 0));
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  it('initializeLoginHandler handles backend login failure and success action flow', fakeAsync(() => {
    spyOn(SharedConstants, 'errorLogin').and.callFake(() => {
    });
    mockSupabaseService.auth.login$.and.returnValue(throwError(() => new Error('bad login')));
    
    service.loginAction$.next({email: 'a@b.com', password: 'x'});
    tick();
    expect(SharedConstants.errorLogin).toHaveBeenCalled();
    
    mockSupabaseService.auth.login$.and.returnValue(of({user: MOCK_RICH_USER, returnUrl: undefined}));
    let user: SimpleUserModel | undefined;
    let profile: RichUserModel | undefined;
    service.loggedUser$.subscribe(v => user = v);
    service.loggedUserFullProfile$.subscribe(v => profile = v);
    service.loginAction$.next({email: 'a@b.com', password: 'x'});
    tick();
    
    expect(user).toEqual(MOCK_RICH_USER);
    expect(profile).toEqual(MOCK_RICH_USER);
  }));
  
  it('public login$ shows loginFailed for a credential-mismatch AuthApiError and completes (frees the caller for retry)', fakeAsync(() => {
    spyOn(SharedConstants, 'errorLogin').and.callFake(() => {
    });
    mockSupabaseService.auth.login$.and.returnValue(
      throwError(() => new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'))
    );

    let completed = false;
    service.login$('a@b.com', 'wrong').subscribe({complete: () => completed = true});
    tick();

    expect(SharedConstants.errorLogin).toHaveBeenCalled();
    expect(completed).toBeTrue();
  }));

  it('public login$ shows operationFailed (not loginFailed) for a non-credential AuthApiError and completes', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'errorLogin').and.callFake(() => {
    });
    mockSupabaseService.auth.login$.and.returnValue(
      throwError(() => new AuthApiError('Internal Server Error', 500, 'unexpected_failure'))
    );

    let completed = false;
    service.login$('a@b.com', 'x').subscribe({complete: () => completed = true});
    tick();

    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), SharedConstants.messages.operationFailed);
    expect(SharedConstants.errorLogin).not.toHaveBeenCalled();
    expect(completed).toBeTrue();
  }));

  it('signup delegates to backend signup$', () => {
    const response: SupabaseSignupResult = {
      user: MOCK_SIMPLE_USER,
      requiresEmailConfirmation: false
    };
    mockSupabaseService.auth.signup$.and.returnValue(of(response));
    
    const out = service.signup('name', 'mail@example.com', 'pass');
    out.subscribe(res => expect(res).toEqual(response));
    expect(mockSupabaseService.auth.signup$).toHaveBeenCalledWith('name', 'mail@example.com', 'pass', undefined);
  });
  
  it('public resetPassword$ handles over-limit, generic errors, and success', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    
    mockSupabaseService.auth.resetPassword$.and.returnValue(
      throwError(() => new PasswordResetError('Email rate limit exceeded', 'over_email_send_rate_limit', 429))
    );
    service.resetPassword$('user@example.com').subscribe({error: () => {}});
    tick();
    
    mockSupabaseService.auth.resetPassword$.and.returnValue(
      throwError(() => new PasswordResetError('Some other failure'))
    );
    service.resetPassword$('user@example.com').subscribe({error: () => {}});
    tick();
    
    mockSupabaseService.auth.resetPassword$.and.returnValue(of(void 0));
    service.resetPassword$('user@example.com').subscribe({error: () => {}});
    tick();
    
    expect(SharedConstants.errorCustom).not.toHaveBeenCalled();
    expect(SharedConstants.successCustom).toHaveBeenCalledTimes(1);
  }));
  
  it('checkUserInCookies sets logged user when session exists', fakeAsync(() => {
    mockSupabaseService.auth.getUserSession$.and.returnValue(of(MOCK_SIMPLE_USER));
    let value: SimpleUserModel | undefined;
    service.loggedUser$.subscribe(v => value = v);
    
    invokeCheckUserInCookies(service);
    tick();
    
    expect(value).toEqual(MOCK_SIMPLE_USER);
  }));
  
  it('reset data flow catches logoff failure branch', fakeAsync(() => {
    mockSupabaseService.auth.logoff$.and.returnValue(Promise.reject(new Error('logout fail')));
    
    service.resetUserDataAction$.next();
    tick();
    
    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalled();
  }));

  it('reset-data confirm cancel shows info, skips the backend, and frees the retry slot', fakeAsync(() => {
    spyOn(SharedConstants, 'infoCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    mockDialog.open.and.returnValue(createConfirmDialogRef({answer: false}));

    service.resetUserDataAction$.next();
    tick();

    expect(SharedConstants.infoCustom).toHaveBeenCalledWith(jasmine.anything(), 'No changes made.');
    expect(mockSupabaseService.delete.allUserData).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    // retry slot must be free — a subsequent confirmed action re-runs cleanly
    mockDialog.open.and.returnValue(createConfirmDialogRef({answer: true}));
    mockSupabaseService.auth.logoff$.and.returnValue(of({error: null}));
    service.resetUserDataAction$.next();
    tick();

    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));

  it('delete-account confirm cancel shows info, skips both stages, and frees the retry slot', fakeAsync(() => {
    spyOn(SharedConstants, 'infoCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    mockDialog.open.and.returnValue(createConfirmDialogRef({answer: false}));
    mockSupabaseService.auth.deleteCurrentUserAccount$.and.returnValue(of(void 0));

    service.deleteAccountAction$.next();
    tick();

    expect(SharedConstants.infoCustom).toHaveBeenCalledWith(jasmine.anything(), 'No changes made.');
    expect(mockSupabaseService.delete.allUserData).not.toHaveBeenCalled();
    expect(mockSupabaseService.auth.deleteCurrentUserAccount$).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    // retry slot must be free — a subsequent confirmed action re-runs cleanly
    mockDialog.open.and.returnValue(createConfirmDialogRef({answer: true}));
    service.deleteAccountAction$.next();
    tick();

    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(1);
    expect(mockSupabaseService.auth.deleteCurrentUserAccount$).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));

  it('updateUsernameAction$ is suppressed when no profile is present', fakeAsync(() => {
    service.updateUsernameAction$.next('newname');
    tick();

    expect(mockSupabaseService.auth.updateUsername$).not.toHaveBeenCalled();
  }));

  it('updateUsernameAction$ shows an error when the post-update profile refresh fails, freeing the retry slot', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    publishRichProfile(service, MOCK_RICH_USER);
    mockSupabaseService.auth.updateUsername$.and.returnValue(of(void 0));
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(throwError(() => new Error('refresh boom')));

    service.updateUsernameAction$.next('newname');
    tick();

    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    expect(SharedConstants.successCustom).not.toHaveBeenCalled();

    // slot must be free — a retry with a healthy refresh succeeds
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of({...MOCK_RICH_USER, username: 'newname'}));
    service.updateUsernameAction$.next('newname');
    tick();

    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));

  it('public updateUsername$ errors without a session and surfaces the snackbar message', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });

    let failed = false;
    service.updateUsername$('newname').subscribe({error: () => failed = true});
    tick();

    expect(failed).toBeTrue();
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(
      jasmine.anything(),
      'Unable to save: user session not found. Please refresh and try again.'
    );
    expect(mockSupabaseService.auth.updateUsername$).not.toHaveBeenCalled();
  }));

  it('public updateUsername$ settles silently when the post-update refresh returns no session', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    publishRichProfile(service, MOCK_RICH_USER);
    mockSupabaseService.auth.updateUsername$.and.returnValue(of(void 0));
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of(null));

    let completed = false;
    service.updateUsername$('newname').subscribe({complete: () => completed = true});
    tick();

    expect(completed).toBeTrue();
    expect(SharedConstants.successCustom).not.toHaveBeenCalled();
  }));

  it('isUsernameAvailable$ delegates with the current user id and errors without a session', fakeAsync(() => {
    mockSupabaseService.auth.isUsernameAvailable$.and.returnValue(of(true));

    // no profile yet — must throw without touching the backend
    let failed = false;
    service.isUsernameAvailable$('someone').subscribe({error: () => failed = true});
    tick();

    expect(failed).toBeTrue();
    expect(mockSupabaseService.auth.isUsernameAvailable$).not.toHaveBeenCalled();

    publishRichProfile(service, MOCK_RICH_USER);
    let available: boolean | undefined;
    service.isUsernameAvailable$('someone').subscribe(v => available = v);
    tick();

    expect(available).toBeTrue();
    expect(mockSupabaseService.auth.isUsernameAvailable$).toHaveBeenCalledWith('someone', MOCK_RICH_USER.id);
  }));

  it('public updateProfileVisibility$ rethrows backend errors after showing them', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    publishRichProfile(service, MOCK_RICH_USER);
    mockSupabaseService.auth.updateProfileVisibility$.and.returnValue(throwError(() => new Error('visibility boom')));

    let failed = false;
    service.updateProfileVisibility$(true).subscribe({error: () => failed = true});
    tick();

    expect(failed).toBeTrue();
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), 'visibility boom');
  }));

  it('public updateProfileVisibility$ emits the private variant message when hiding the profile', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    publishRichProfile(service, {...MOCK_RICH_USER, public: true});
    mockSupabaseService.auth.updateProfileVisibility$.and.returnValue(of(void 0));

    let completed = false;
    service.updateProfileVisibility$(false).subscribe({complete: () => completed = true});
    tick();

    expect(completed).toBeTrue();
    expect(SharedConstants.successCustom).toHaveBeenCalledWith(
      jasmine.anything(),
      'Your public profile is now private.'
    );

    let latestProfile: RichUserModel | undefined;
    service.loggedUserFullProfile$.subscribe(profile => latestProfile = profile);
    tick();

    expect(latestProfile?.public).toBeFalse();
  }));

  it('changePassword$ maps weak-password and expired-session failures to safe messages', fakeAsync(() => {
    mockSupabaseService.auth.updatePassword$.and.returnValue(
      throwError(() => ({code: 'weak_password', message: 'Password is too weak'}))
    );
    service.changePassword$.next({newPassword: 'weak'});
    tick();

    expect(mockSnackBar.open).toHaveBeenCalledWith(
      SharedConstants.messages.resetPassword.weakPassword,
      undefined,
      jasmine.anything()
    );

    mockSupabaseService.auth.updatePassword$.and.returnValue(
      throwError(() => ({code: 'session_not_found', message: 'session gone'}))
    );
    service.changePassword$.next({newPassword: 'NewPass123!'});
    tick();

    expect(mockSnackBar.open).toHaveBeenCalledWith(
      SharedConstants.messages.resetPassword.invalidSession,
      undefined,
      jasmine.anything()
    );
  }));

  it('public resetPassword$ captures analytics and rethrows on failure, succeeding otherwise', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    mockSupabaseService.auth.resetPassword$.and.returnValue(throwError(() => new Error('mail boom')));

    let failed = false;
    service.resetPassword$('user@example.com').subscribe({error: () => failed = true});
    tick();

    expect(failed).toBeTrue();
    expect(mockAnalytics.capture).toHaveBeenCalledWith('auth.password_reset_request_failed', {});
    expect(SharedConstants.successCustom).not.toHaveBeenCalled();

    mockSupabaseService.auth.resetPassword$.and.returnValue(of(void 0));
    let completed = false;
    service.resetPassword$('user@example.com').subscribe({complete: () => completed = true});
    tick();

    expect(completed).toBeTrue();
    expect(SharedConstants.successCustom).toHaveBeenCalledWith(
      jasmine.anything(),
      SharedConstants.messages.passwordResetEmailSent
    );
  }));

  it('successful SSO login records the initiation analytics event', fakeAsync(() => {
    mockSupabaseService.auth.loginWithOAuth$.and.returnValue(of(void 0));

    service.loginWithSSO('google', '/cb');
    tick();

    expect(mockSupabaseService.auth.loginWithOAuth$).toHaveBeenCalledWith('google', '/cb');
    expect(mockAnalytics.capture).toHaveBeenCalledWith('auth.sso_login_initiated', {provider: 'google'});
  }));
});
