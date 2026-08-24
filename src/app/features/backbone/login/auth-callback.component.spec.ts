import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  ReplaySubject,
  Subject
} from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RichUserModel } from '../../backend/supabase.types';
import { AuthCallbackComponent } from './auth-callback.component';
import { MOCK_RICH_USER } from './__tests__/user-management-service/test-setup';
import { UserManagementService } from './user-management.service';


describe('AuthCallbackComponent', () => {
  type AuthCallbackProfile = (Omit<RichUserModel, 'username'> & {username: string | null}) | null | undefined;
  type AuthCallbackUserManagementMock = {
    loggedUserFullProfile$: Observable<AuthCallbackProfile>;
    handleOAuthCallback: jasmine.Spy<() => void>;
    oauthCallbackFailed$: Observable<void>;
    oauthCallbackSucceeded$: Observable<AuthCallbackProfile>;
  };

  let component: AuthCallbackComponent;
  let fixture: ComponentFixture<AuthCallbackComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockUserManagementService: AuthCallbackUserManagementMock;
  let loggedUserFullProfile$: ReplaySubject<AuthCallbackProfile>;
  let oauthCallbackFailed$: Subject<void>;
  let oauthCallbackSucceeded$: Subject<AuthCallbackProfile>;

  function profileWithUsername(username: string | null): Exclude<AuthCallbackProfile, null | undefined> {
    return {
      ...MOCK_RICH_USER,
      id: '1',
      email: 'a@b.com',
      username
    };
  }
  
  beforeEach(async () => {
    loggedUserFullProfile$ = new ReplaySubject<AuthCallbackProfile>(1);
    oauthCallbackFailed$ = new Subject<void>();
    oauthCallbackSucceeded$ = new Subject<AuthCallbackProfile>();
    
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    
    mockUserManagementService = {
      loggedUserFullProfile$: loggedUserFullProfile$.asObservable(),
      handleOAuthCallback: jasmine.createSpy<() => void>('handleOAuthCallback'),
      oauthCallbackFailed$: oauthCallbackFailed$.asObservable(),
      oauthCallbackSucceeded$: oauthCallbackSucceeded$.asObservable()
    };
    
    await TestBed.configureTestingModule({
      declarations: [AuthCallbackComponent],
      imports: [MatProgressSpinnerModule],
      providers: [
        {provide: Router, useValue: mockRouter},
        {provide: UserManagementService, useValue: mockUserManagementService}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    
    fixture = TestBed.createComponent(AuthCallbackComponent);
    component = fixture.componentInstance;
  });
  
  // ── Init ───────────────────────────────────────────────────────────────────
  
  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
  
  it('calls handleOAuthCallback on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(mockUserManagementService.handleOAuthCallback).toHaveBeenCalled();
  }));
  
  // ── Routing ────────────────────────────────────────────────────────────────
  
  it('navigates to /user/area when user has a proper username', fakeAsync(() => {
    fixture.detectChanges();
    
    oauthCallbackSucceeded$.next(profileWithUsername('myuser'));
    tick();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/user/area']);
  }));
  
  it('navigates to /auth/complete-profile when username starts with user_', fakeAsync(() => {
    fixture.detectChanges();
    
    oauthCallbackSucceeded$.next(profileWithUsername('user_abc123'));
    tick();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/complete-profile']);
  }));
  
  it('navigates to /auth/complete-profile when username is empty', fakeAsync(() => {
    fixture.detectChanges();
    
    oauthCallbackSucceeded$.next(profileWithUsername(''));
    tick();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/complete-profile']);
  }));
  
  it('navigates to /auth/complete-profile when username is null', fakeAsync(() => {
    fixture.detectChanges();
    
    oauthCallbackSucceeded$.next(profileWithUsername(null));
    tick();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/complete-profile']);
  }));
  
  it('does not navigate when user is null/undefined', fakeAsync(() => {
    fixture.detectChanges();
    
    loggedUserFullProfile$.next(undefined);
    tick();
    
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));
  
  it('does not navigate when user is null', fakeAsync(() => {
    fixture.detectChanges();
    
    loggedUserFullProfile$.next(null);
    tick();
    
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  it('ignores a replayed global profile from before init and remains Failed without navigation when the callback fails', fakeAsync(() => {
    loggedUserFullProfile$.next(profileWithUsername('myuser'));

    fixture.detectChanges();
    tick();
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    oauthCallbackFailed$.next();
    fixture.detectChanges();
    tick();

    const failedBlock: HTMLElement | null = fixture.nativeElement.querySelector('.auth-callback-container [role="alert"]');
    expect(failedBlock).toBeTruthy();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  // ── OAuth failure settlement (S3) ───────────────────────────────────────────

  it('renders the Failed state with role="alert" and moves focus to the heading when oauthCallbackFailed$ emits, without navigating automatically', fakeAsync(() => {
    fixture.detectChanges();
    oauthCallbackFailed$.next();
    fixture.detectChanges();
    tick();

    const failedBlock: HTMLElement | null = fixture.nativeElement.querySelector('.auth-callback-container [role="alert"]');
    expect(failedBlock).toBeTruthy();
    const heading = failedBlock?.querySelector('h2');
    expect(document.activeElement).toBe(heading as Element);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  it('navigates to /auth/login exactly once when "Back to login" is clicked in the Failed state', fakeAsync(() => {
    fixture.detectChanges();
    oauthCallbackFailed$.next();
    fixture.detectChanges();
    tick();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.auth-callback-container button');
    button.click();
    fixture.detectChanges();

    expect(mockRouter.navigate).toHaveBeenCalledOnceWith(['/auth/login']);
  }));

  it('keeps the same .auth-callback-container bounding box across Loading and Failed states', fakeAsync(() => {
    fixture.detectChanges();
    const container: HTMLElement = fixture.nativeElement.querySelector('.auth-callback-container');
    const loadingRect = container.getBoundingClientRect();

    oauthCallbackFailed$.next();
    fixture.detectChanges();
    tick();
    const failedRect = container.getBoundingClientRect();

    expect(failedRect.width).toBeCloseTo(loadingRect.width, 0);
    expect(failedRect.top).toBeCloseTo(loadingRect.top, 0);
    expect(fixture.nativeElement.querySelectorAll('.auth-callback-container').length).toBe(1);
  }));

  // ── Late-session-after-Failed latch (review repair regression) ─────────────

  it('does not navigate when a late loggedUserFullProfile$ emission arrives after the callback already settled to Failed', fakeAsync(() => {
    fixture.detectChanges();

    oauthCallbackFailed$.next();
    tick();

    // Simulate a late global SIGNED_IN/profile event racing in after the
    // component has already rendered the terminal Failed state.
    loggedUserFullProfile$.next(profileWithUsername('myuser'));
    tick();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  it('does not navigate when a late callback success event arrives after the callback already settled to Failed', fakeAsync(() => {
    fixture.detectChanges();

    oauthCallbackFailed$.next();
    tick();

    oauthCallbackSucceeded$.next(profileWithUsername('myuser'));
    tick();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  it('does not navigate to complete-profile either when a late profile event arrives after Failed', fakeAsync(() => {
    fixture.detectChanges();

    oauthCallbackFailed$.next();
    tick();

    loggedUserFullProfile$.next(profileWithUsername('user_lateuser'));
    tick();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  it('still shows the Failed state (does not flip back to Loading) when a late profile event arrives after Failed', fakeAsync(() => {
    fixture.detectChanges();

    oauthCallbackFailed$.next();
    fixture.detectChanges();
    tick();

    loggedUserFullProfile$.next(profileWithUsername('myuser'));
    fixture.detectChanges();
    tick();

    const failedBlock: HTMLElement | null = fixture.nativeElement.querySelector('.auth-callback-container [role="alert"]');
    expect(failedBlock).toBeTruthy();
  }));
});
