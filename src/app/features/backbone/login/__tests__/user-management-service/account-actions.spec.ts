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
    let callbackUser: typeof MOCK_RICH_USER | undefined;
    service.loggedUser$.subscribe(v => user = v);
    service.loggedUserFullProfile$.subscribe(v => profile = v);
    service.oauthCallbackSucceeded$.subscribe(v => callbackUser = v);
    
    service.handleOAuthCallback();
    tick();
    
    expect(mockSupabaseService.auth.handleOAuthCallback$).toHaveBeenCalled();
    expect(user).toEqual(MOCK_RICH_USER);
    expect(profile).toEqual(MOCK_RICH_USER);
    expect(callbackUser).toEqual(MOCK_RICH_USER);
  }));
  
  it('shows error when OAuth callback handling fails', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    let failed = false;
    let successCount = 0;
    service.oauthCallbackFailed$.subscribe(() => failed = true);
    service.oauthCallbackSucceeded$.subscribe(() => successCount++);
    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(throwError(() => new Error('oauth fail')));
    
    service.handleOAuthCallback();
    tick();
    
    expect(failed).toBeTrue();
    expect(successCount).toBe(0);
    expect(SharedConstants.errorCustom).not.toHaveBeenCalled();
  }));

  it('publishes oauthCallbackFailed$ with a null-session reason when the callback settles with no session', fakeAsync(() => {
    let failed = false;
    let successCount = 0;
    service.oauthCallbackFailed$.subscribe(() => failed = true);
    service.oauthCallbackSucceeded$.subscribe(() => successCount++);
    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(of(null));

    service.handleOAuthCallback();
    tick();

    expect(failed).toBeTrue();
    expect(successCount).toBe(0);
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

  it('publishes oauthCallbackSucceeded$ exactly once per successful handleOAuthCallback action', fakeAsync(() => {
    let emitCount = 0;
    let callbackUser: typeof MOCK_RICH_USER | undefined;
    service.oauthCallbackSucceeded$.subscribe(v => {
      emitCount++;
      callbackUser = v;
    });

    service.handleOAuthCallback();
    tick();

    expect(emitCount).toBe(1);
    expect(callbackUser).toEqual(MOCK_RICH_USER);
  }));

  it('does not replay oauthCallbackSucceeded$ to late subscribers', fakeAsync(() => {
    service.handleOAuthCallback();
    tick();

    let callbackUser: typeof MOCK_RICH_USER | undefined;
    service.oauthCallbackSucceeded$.subscribe(v => callbackUser = v);
    tick();

    expect(callbackUser).toBeUndefined();
  }));

  it('does not process an in-flight handleOAuthCallback settlement after the service is destroyed (cancellation)', fakeAsync(() => {
    const inFlight = new Subject<typeof MOCK_RICH_USER | null>();
    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(inFlight.asObservable());
    let profile: typeof MOCK_RICH_USER | undefined;
    let callbackUser: typeof MOCK_RICH_USER | undefined;
    service.loggedUserFullProfile$.subscribe(v => profile = v);
    service.oauthCallbackSucceeded$.subscribe(v => callbackUser = v);

    service.handleOAuthCallback();
    service.ngOnDestroy();
    inFlight.next(MOCK_RICH_USER);
    inFlight.complete();
    tick();

    expect(profile).toBeUndefined();
    expect(callbackUser).toBeUndefined();
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

  // ── S4 destructive-action retry (ATP-S4-01..04, exact tests from the
  // accepted AcceptanceTestPlanAuthResilience.md §13 lines 753-864) ────────
  //
  // Both `initializeResetUserDataHandler` (ST-19) and `initializeDeleteAccountHandler`
  // (ST-20/21) previously caught backend failures into `NEVER`, permanently
  // occupying their `exhaustMap` slot. Per Technical Decision 6 (chosen
  // design: no resume/skip state — see §Decision 6), a destructive-action
  // retry always genuinely re-runs stage 1, relying on `deleteAllUserData()`'s
  // own verified backend idempotency; it never skips stage 1 based on
  // in-memory/persisted state.

  it('ATP-S4-01: retries delete-all-data after a failed attempt, issuing a second backend call', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    spyOn(console, 'error');
    mockSupabaseService.delete.allUserData.and.returnValue(throwError(() => new Error('delete failed')));

    service.resetUserDataAction$.next();
    tick();
    // first attempt failed — reconfirm and retry:
    mockSupabaseService.delete.allUserData.and.returnValue(of(void 0));
    mockSupabaseService.auth.logoff$.and.returnValue(of({error: null}));
    service.resetUserDataAction$.next();
    tick();

    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(2);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));

  it('S4-supplemental: suppresses a duplicate resetUserDataAction received while a destructive reset flow is in-flight', fakeAsync(() => {
    // Regression for the reset-data flow's outer flattening operator: the confirm
    // dialog through final sign-out must be a single exhaustMap boundary, matching
    // initializeDeleteAccountHandler's already-correct composite exhaustMap. Before
    // the fix, an outer switchMap wrapped only the dialog, so a duplicate action
    // received while stage 1 (allUserData()) was still in-flight cancelled the
    // first attempt's dialog subscription and opened a second dialog/stage-1 call.
    const inFlight = new Subject<void>();
    mockSupabaseService.delete.allUserData.and.returnValue(inFlight.asObservable());

    service.resetUserDataAction$.next();
    tick();
    service.resetUserDataAction$.next(); // duplicate while stage 1 is still in-flight
    tick();

    expect(mockDialog.open).toHaveBeenCalledTimes(1);
    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(1);

    mockSupabaseService.auth.logoff$.and.returnValue(of({error: null}));
    inFlight.next();
    inFlight.complete();
    tick();

    // slot frees again after completion — a fresh, later action re-runs cleanly
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    mockSupabaseService.delete.allUserData.and.returnValue(of(void 0));
    service.resetUserDataAction$.next();
    tick();

    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(2);
    expect(mockDialog.open).toHaveBeenCalledTimes(2);
  }));

  it('ATP-S4-02: retries delete-account after a stage-1 failure, re-issuing stage 1', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    spyOn(console, 'error');
    mockSupabaseService.delete.allUserData.and.returnValue(throwError(() => new Error('stage-1 failed')));

    service.deleteAccountAction$.next();
    tick();
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), 'Account deletion failed while removing your data. Please try again or contact support.');

    mockSupabaseService.delete.allUserData.and.returnValue(of(void 0));
    mockSupabaseService.auth.deleteCurrentUserAccount$.and.returnValue(of(void 0));
    mockSupabaseService.auth.logoffLocal$.and.returnValue(of({error: null}));
    service.deleteAccountAction$.next();
    tick();

    // stage 2 only reached on the successful retry, never on the failed first attempt
    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(2);
    expect(mockSupabaseService.auth.deleteCurrentUserAccount$).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  }));

  it('ATP-S4-03: [decisive] retries delete-account after a stage-2 failure, always re-running stage 1 idempotently and silently', fakeAsync(() => {
    mockSupabaseService.delete.allUserData.and.returnValue(of(void 0)); // stage 1 succeeds
    mockSupabaseService.auth.deleteCurrentUserAccount$.and.returnValue(throwError(() => new Error('stage-2 failed')));
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    spyOn(console, 'error');

    service.deleteAccountAction$.next(); // stage 1 OK, stage 2 fails
    tick();
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), 'Account deletion failed. Please try again or contact support.');
    expect(SharedConstants.errorCustom).not.toHaveBeenCalledWith(jasmine.anything(), 'Account deletion failed while removing your data. Please try again or contact support.');
    (SharedConstants.errorCustom as jasmine.Spy).calls.reset();

    mockSupabaseService.auth.deleteCurrentUserAccount$.and.returnValue(of(void 0)); // stage 2 now succeeds
    mockSupabaseService.auth.logoffLocal$.and.returnValue(of({error: null}));
    service.deleteAccountAction$.next(); // retry: re-confirm dialog
    tick();

    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(2); // stage 1 genuinely re-ran, not skipped
    expect(SharedConstants.errorCustom).not.toHaveBeenCalled(); // no stage-1 message on this silent, non-erroring re-run
    expect(mockSupabaseService.auth.deleteCurrentUserAccount$).toHaveBeenCalledTimes(2);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));

  it('ATP-S4-04: [decisive] a retry after stage-1 success and stage-2 failure genuinely re-issues and awaits stage 1 before stage 2 runs again, so data created between attempts is not orphaned', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    spyOn(console, 'error');

    const order: string[] = [];
    let allUserDataCallCount = 0;
    mockSupabaseService.delete.allUserData.and.callFake(() => {
      allUserDataCallCount++;
      order.push('stage1');
      // real backend is verified-idempotent per Technical §1.2 — always resolves, whether no-op or genuine removal
      return of(void 0);
    });
    mockSupabaseService.auth.deleteCurrentUserAccount$.and.callFake(() => {
      order.push('stage2');
      return throwError(() => new Error('stage-2 failed'));
    });

    service.deleteAccountAction$.next(); // stage 1 call #1 (succeeds), stage 2 fails
    tick();

    // simulate the user creating new data in the app between the failed attempt and the retry
    // (out of this handler's control — the test asserts the retry's own re-issuance, which is
    // what makes such newly-created data reachable for deletion by the real, idempotent backend call)
    mockSupabaseService.auth.deleteCurrentUserAccount$.and.callFake(() => {
      order.push('stage2');
      return of(void 0);
    });
    mockSupabaseService.auth.logoffLocal$.and.returnValue(of({error: null}));
    service.deleteAccountAction$.next(); // retry
    tick();

    expect(allUserDataCallCount).toBe(2);
    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(2);
    expect(mockSupabaseService.auth.deleteCurrentUserAccount$).toHaveBeenCalledTimes(2);
    // the decisive assertion distinguishing the DL-1-approved design (Option C: always re-run
    // stage 1) from the rejected Option A (per-user resume flag skipping stage 1) — a skip-stage-1
    // regression would produce ['stage1','stage2','stage2'], missing the second 'stage1'.
    expect(order).toEqual(['stage1', 'stage2', 'stage1', 'stage2']);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));

  // ── S4 supplemental coverage (not ATP-S4 IDs) ───────────────────────────
  // Useful additional regression coverage beyond the four accepted ATP-S4
  // tests above: duplicate in-flight suppression (C2) and destroy-time
  // cancellation, both for `initializeDeleteAccountHandler`'s single
  // exhaustMap flattening the confirm dialog through final sign-out.

  it('S4-supplemental: suppresses a duplicate deleteAccountAction received while a destructive delete flow is in-flight', fakeAsync(() => {
    const inFlight = new Subject<void>();
    mockSupabaseService.delete.allUserData.and.returnValue(inFlight.asObservable());

    service.deleteAccountAction$.next();
    tick();
    service.deleteAccountAction$.next(); // duplicate while stage 1 is still in-flight
    tick();

    expect(mockDialog.open).toHaveBeenCalledTimes(1);
    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(1);

    mockSupabaseService.auth.deleteCurrentUserAccount$.and.returnValue(of(void 0));
    inFlight.next();
    inFlight.complete();
    tick();

    expect(mockSupabaseService.auth.deleteCurrentUserAccount$).toHaveBeenCalledTimes(1);
  }));

  it('S4-supplemental: does not process an in-flight deletion after the service is destroyed (cancellation), with no duplicate notifications', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const inFlight = new Subject<void>();
    mockSupabaseService.delete.allUserData.and.returnValue(inFlight.asObservable());

    service.deleteAccountAction$.next();
    tick();
    service.ngOnDestroy();
    inFlight.next();
    inFlight.complete();
    tick();

    expect(mockSupabaseService.auth.deleteCurrentUserAccount$).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(SharedConstants.successCustom).not.toHaveBeenCalled();
    expect(SharedConstants.errorCustom).not.toHaveBeenCalled();
  }));

  it('S4-supplemental: shows a truthful, distinct error when sign-out fails after a successful delete-all-data, freeing the retry slot', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    spyOn(console, 'error');
    mockSupabaseService.delete.allUserData.and.returnValue(of(void 0));
    mockSupabaseService.auth.logoff$.and.returnValue(throwError(() => new Error('logoff failed')));

    service.resetUserDataAction$.next();
    tick();

    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), 'Your data was deleted, but automatic sign-out failed. Please refresh the page or sign out manually.');
    expect(SharedConstants.successCustom).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    // retry slot must be free — a subsequent confirmed action re-runs cleanly
    mockSupabaseService.auth.logoff$.and.returnValue(of({error: null}));
    service.resetUserDataAction$.next();
    tick();

    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(2);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));

  it('S4-supplemental: shows a truthful, distinct error when logoff$ resolves with a non-null error after a successful delete-all-data, freeing the retry slot', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    spyOn(console, 'error');
    mockSupabaseService.delete.allUserData.and.returnValue(of(void 0));
    // Supabase signOut() resolves rather than throws on failure — logoff$ emits {error} instead of erroring.
    mockSupabaseService.auth.logoff$.and.returnValue(of({error: new Error('logoff resolved error')}));

    service.resetUserDataAction$.next();
    tick();

    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), 'Your data was deleted, but automatic sign-out failed. Please refresh the page or sign out manually.');
    expect(SharedConstants.successCustom).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    // retry slot must be free — a subsequent confirmed action re-runs cleanly
    mockSupabaseService.auth.logoff$.and.returnValue(of({error: null}));
    service.resetUserDataAction$.next();
    tick();

    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(2);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));

  // ── Finding B regression: initializeDeleteAccountHandler's logoffLocal$()
  // branch previously converted a thrown error into `of({error: null})` and
  // never inspected an emitted `{error}`, so both failure forms fell through
  // to the success tap (successCustom + navigate) — a false-success report
  // even though the user was never actually signed out locally. These mirror
  // the equivalent, already-correct logoff$() tests above for reset-data.

  it('S4-supplemental: shows a truthful, distinct error when logoffLocal$ throws after a successful account deletion, freeing the retry slot', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    spyOn(console, 'error');
    mockSupabaseService.delete.allUserData.and.returnValue(of(void 0));
    mockSupabaseService.auth.deleteCurrentUserAccount$.and.returnValue(of(void 0));
    mockSupabaseService.auth.logoffLocal$.and.returnValue(throwError(() => new Error('local logoff failed')));

    service.deleteAccountAction$.next();
    tick();

    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), 'Your account has been permanently deleted, but automatic sign-out failed. Please refresh the page or sign out manually.');
    expect(SharedConstants.successCustom).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    // retry slot must be free — a subsequent confirmed action re-runs cleanly
    mockSupabaseService.auth.logoffLocal$.and.returnValue(of({error: null}));
    service.deleteAccountAction$.next();
    tick();

    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(2);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));

  it('S4-supplemental: shows a truthful, distinct error when logoffLocal$ resolves with a non-null error after a successful account deletion, freeing the retry slot', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    spyOn(console, 'error');
    mockSupabaseService.delete.allUserData.and.returnValue(of(void 0));
    mockSupabaseService.auth.deleteCurrentUserAccount$.and.returnValue(of(void 0));
    // Supabase signOut() resolves rather than throws on failure — logoffLocal$ emits {error} instead of erroring.
    mockSupabaseService.auth.logoffLocal$.and.returnValue(of({error: new Error('local logoff resolved error')}));

    service.deleteAccountAction$.next();
    tick();

    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), 'Your account has been permanently deleted, but automatic sign-out failed. Please refresh the page or sign out manually.');
    expect(SharedConstants.successCustom).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    // retry slot must be free — a subsequent confirmed action re-runs cleanly
    mockSupabaseService.auth.logoffLocal$.and.returnValue(of({error: null}));
    service.deleteAccountAction$.next();
    tick();

    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalledTimes(2);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));
});
