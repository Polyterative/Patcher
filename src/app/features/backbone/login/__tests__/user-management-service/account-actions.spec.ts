import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  of,
  Subject,
  throwError
} from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../../user-management.service';
import { SimpleUserModel } from 'src/app/features/backend/supabase.service';
import {
  cleanupUserManagementServiceTest,
  createConfirmDialogRef,
  MOCK_RICH_USER,
  publishRichProfile,
  setupUserManagementServiceTest
} from './test-setup';


describe('UserManagementService - Account Actions', () => {
  type UserManagementServiceTestSetup = ReturnType<typeof setupUserManagementServiceTest>;

  let service: UserManagementService;
  let mockSupabaseService: UserManagementServiceTestSetup['mockSupabaseService'];
  let mockRouter: UserManagementServiceTestSetup['mockRouter'];
  let mockDialog: UserManagementServiceTestSetup['mockDialog'];
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
    mockSupabaseService = setup.mockSupabaseService;
    mockRouter = setup.mockRouter;
    mockDialog = setup.mockDialog;
    mockSupabaseService.auth.loginWithOAuth$.and.returnValue(of(void 0));
    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(of(MOCK_RICH_USER));
    mockSupabaseService.auth.updateUsername$.and.returnValue(of(void 0));
    mockSupabaseService.delete.allUserData.and.returnValue(of(void 0));
    mockDialog.open.and.returnValue(createConfirmDialogRef({answer: true}));
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  it('triggers SSO login action and delegates to backend', fakeAsync(() => {
    service.loginWithSSO('google', '/cb');
    tick();
    expect(mockSupabaseService.auth.loginWithOAuth$).toHaveBeenCalledWith('google', '/cb');
  }));
  
  it('shows error when SSO backend call fails', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(console, 'error');
    mockSupabaseService.auth.loginWithOAuth$.and.returnValue(throwError(() => new Error('sso failed')));
    
    service.loginWithSSO('github', '/cb');
    tick();
    
    expect(console.error).toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  }));
  
  it('handles OAuth callback action and updates user streams', fakeAsync(() => {
    let user: SimpleUserModel | undefined;
    let profile: typeof MOCK_RICH_USER | undefined;
    service.loggedUser$.subscribe(v => user = v);
    service.loggedUserFullProfile$.subscribe(v => profile = v);
    
    service.handleOAuthCallback();
    tick();
    
    expect(mockSupabaseService.auth.handleOAuthCallback$).toHaveBeenCalled();
    expect(user).toEqual(MOCK_RICH_USER);
    expect(profile).toEqual(MOCK_RICH_USER);
  }));
  
  it('shows error when OAuth callback handling fails', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    let failed = false;
    service.oauthCallbackFailed$.subscribe(() => failed = true);
    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(throwError(() => new Error('oauth fail')));
    
    service.handleOAuthCallback();
    tick();
    
    expect(failed).toBeTrue();
    expect(SharedConstants.errorCustom).not.toHaveBeenCalled();
  }));

  it('publishes oauthCallbackFailed$ with a null-session reason when the callback settles with no session', fakeAsync(() => {
    let failed = false;
    service.oauthCallbackFailed$.subscribe(() => failed = true);
    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(of(null));

    service.handleOAuthCallback();
    tick();

    expect(failed).toBeTrue();
  }));

  // ── Duplicate-action suppression (review repair regression) ────────────────
  //
  // Duplicate handleOAuthCallback() actions arriving while a callback attempt
  // is still in flight must be suppressed (ignored) rather than cancelling
  // and restarting the in-flight attempt. A `switchMap`-based flattening
  // strategy re-invokes the backend call and cancels the previous attempt on
  // every duplicate action, so this test fails under `switchMap` and only
  // passes once the handler suppresses duplicates while in-flight.

  it('suppresses a duplicate handleOAuthCallback action received while one is still in-flight', fakeAsync(() => {
    const inFlight = new Subject<typeof MOCK_RICH_USER | null>();
    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(inFlight.asObservable());
    let profile: typeof MOCK_RICH_USER | undefined;
    service.loggedUserFullProfile$.subscribe(v => profile = v);

    service.handleOAuthCallback();
    service.handleOAuthCallback(); // duplicate while the first attempt is still in-flight
    tick();

    expect(mockSupabaseService.auth.handleOAuthCallback$).toHaveBeenCalledTimes(1);

    inFlight.next(MOCK_RICH_USER);
    inFlight.complete();
    tick();

    expect(profile).toEqual(MOCK_RICH_USER);
  }));

  it('frees the flattening slot after a successful settlement so the next action is processed', fakeAsync(() => {
    service.handleOAuthCallback();
    tick();
    service.handleOAuthCallback();
    tick();

    expect(mockSupabaseService.auth.handleOAuthCallback$).toHaveBeenCalledTimes(2);
  }));

  it('frees the flattening slot after an API error so the next action is processed', fakeAsync(() => {
    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(throwError(() => new Error('oauth fail')));
    service.handleOAuthCallback();
    tick();

    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(of(MOCK_RICH_USER));
    let profile: typeof MOCK_RICH_USER | undefined;
    service.loggedUserFullProfile$.subscribe(v => profile = v);
    service.handleOAuthCallback();
    tick();

    expect(mockSupabaseService.auth.handleOAuthCallback$).toHaveBeenCalledTimes(2);
    expect(profile).toEqual(MOCK_RICH_USER);
  }));

  it('frees the flattening slot after a null-session (missing session) settlement so the next action is processed', fakeAsync(() => {
    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(of(null));
    service.handleOAuthCallback();
    tick();

    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(of(MOCK_RICH_USER));
    let profile: typeof MOCK_RICH_USER | undefined;
    service.loggedUserFullProfile$.subscribe(v => profile = v);
    service.handleOAuthCallback();
    tick();

    expect(mockSupabaseService.auth.handleOAuthCallback$).toHaveBeenCalledTimes(2);
    expect(profile).toEqual(MOCK_RICH_USER);
  }));

  it('publishes the signed-in profile exactly once per successful handleOAuthCallback action (completion/exactly-once)', fakeAsync(() => {
    let emitCount = 0;
    service.loggedUserFullProfile$.subscribe(v => {
      if (v) emitCount++;
    });

    service.handleOAuthCallback();
    tick();

    expect(emitCount).toBe(1);
  }));

  it('does not process an in-flight handleOAuthCallback settlement after the service is destroyed (cancellation)', fakeAsync(() => {
    const inFlight = new Subject<typeof MOCK_RICH_USER | null>();
    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(inFlight.asObservable());
    let profile: typeof MOCK_RICH_USER | undefined;
    service.loggedUserFullProfile$.subscribe(v => profile = v);

    service.handleOAuthCallback();
    service.ngOnDestroy();
    inFlight.next(MOCK_RICH_USER);
    inFlight.complete();
    tick();

    expect(profile).toBeUndefined();
  }));
  
  it('handles resetPasswordAction$ error variants and success', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    
    mockSupabaseService.auth.resetPassword$.and.returnValue(throwError(() => ({error_code: 'over_email_send_rate_limit'})));
    service.resetPasswordAction$.next('user@example.com');
    tick();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    
    mockSupabaseService.auth.resetPassword$.and.returnValue(throwError(() => new Error('generic')));
    service.resetPasswordAction$.next('user@example.com');
    tick();
    expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(2);
    
    mockSupabaseService.auth.resetPassword$.and.returnValue(of(void 0));
    service.resetPasswordAction$.next('user@example.com');
    tick();
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));
  
  it('runs updateUsernameAction$ success and error branches', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of({...MOCK_RICH_USER, username: 'newname'}));
    publishRichProfile(service, MOCK_RICH_USER);
    
    service.updateUsernameAction$.next('newname');
    tick();
    expect(mockSupabaseService.auth.updateUsername$).toHaveBeenCalledWith(MOCK_RICH_USER.id, 'newname');
    expect(SharedConstants.successCustom).toHaveBeenCalled();
    
    mockSupabaseService.auth.updateUsername$.and.returnValue(throwError(() => ({message: 'taken'})));
    service.updateUsernameAction$.next('newname2');
    tick();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  }));

  it('hides the username form after updateUsernameAction$ succeeds', fakeAsync(() => {
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of({...MOCK_RICH_USER, username: 'newname'}));
    publishRichProfile(service, MOCK_RICH_USER);

    service.toggleUsernameForm$.next(true);
    tick();

    let visible: boolean | undefined;
    service.showUsernameForm$.subscribe(v => visible = v);
    expect(visible).toBe(true);

    service.updateUsernameAction$.next('newname');
    tick();

    expect(visible).toBe(false);
  }));

  it('keeps the username form open when updateUsernameAction$ fails', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    publishRichProfile(service, MOCK_RICH_USER);
    mockSupabaseService.auth.updateUsername$.and.returnValue(throwError(() => new Error('taken')));

    service.toggleUsernameForm$.next(true);
    tick();

    let visible: boolean | undefined;
    service.showUsernameForm$.subscribe(v => visible = v);

    service.updateUsernameAction$.next('newname');
    tick();

    expect(visible).toBe(true);
  }));
  
  it('public updateUsername$ refreshes profile and emits success', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    publishRichProfile(service, MOCK_RICH_USER);
    mockSupabaseService.auth.updateUsername$.and.returnValue(of(void 0));
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of({...MOCK_RICH_USER, username: 'after'}));
    
    let completed = false;
    service.updateUsername$('after').subscribe({
      complete: () => completed = true
    });
    tick();
    
    expect(completed).toBeTrue();
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));
  
  it('public updateUsername$ rethrows backend errors', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    publishRichProfile(service, MOCK_RICH_USER);
    mockSupabaseService.auth.updateUsername$.and.returnValue(throwError(() => new Error('update failed')));
    
    let failed = false;
    service.updateUsername$('after').subscribe({
      error: () => failed = true
    });
    tick();
    
    expect(failed).toBeTrue();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  }));

  it('public updateProfileVisibility$ updates the local rich profile and emits success', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    publishRichProfile(service, MOCK_RICH_USER);
    mockSupabaseService.auth.updateProfileVisibility$.and.returnValue(of(void 0));

    let completed = false;
    service.updateProfileVisibility$(true).subscribe({
      complete: () => completed = true
    });
    tick();

    let latestProfile: typeof MOCK_RICH_USER | undefined;
    service.loggedUserFullProfile$.subscribe(profile => latestProfile = profile);
    tick();

    expect(completed).toBeTrue();
    expect(mockSupabaseService.auth.updateProfileVisibility$).toHaveBeenCalledWith(MOCK_RICH_USER.id, true);
    expect(latestProfile?.public).toBeTrue();
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));

  it('resets account data, logs out, and navigates on confirmation', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    mockSupabaseService.auth.logoff$.and.returnValue(of({error: null}));
    
    service.resetUserDataAction$.next();
    tick();
    
    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));
  
  it('handles reset-data backend error without navigation', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(console, 'error');
    mockSupabaseService.delete.allUserData.and.returnValue(throwError(() => new Error('delete failed')));
    mockRouter.navigate.calls.reset();
    
    service.resetUserDataAction$.next();
    tick();
    
    expect(console.error).toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  it('deletes the full account, clears session locally, and navigates on confirmation', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    mockSupabaseService.auth.deleteCurrentUserAccount$.and.returnValue(of(void 0));
    mockSupabaseService.auth.logoffLocal$.and.returnValue(of({error: null}));
    
    service.deleteAccountAction$.next();
    tick();
    
    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalled();
    expect(mockSupabaseService.auth.deleteCurrentUserAccount$).toHaveBeenCalled();
    expect(mockSupabaseService.auth.logoffLocal$).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));
});
