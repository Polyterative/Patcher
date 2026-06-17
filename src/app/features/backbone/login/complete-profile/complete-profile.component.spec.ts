import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import {
  of,
  ReplaySubject,
  Subject,
  throwError
} from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { CompleteProfileComponent } from './complete-profile.component';
import { UserManagementService } from '../user-management.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';


describe('CompleteProfileComponent', () => {
  let component: CompleteProfileComponent;
  let fixture: ComponentFixture<CompleteProfileComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockUserManagementService: any;
  let loggedUserFullProfile$: ReplaySubject<any>;
  
  beforeEach(async () => {
    loggedUserFullProfile$ = new ReplaySubject<any>(1);
    
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    
    mockUserManagementService = {
      loggedUserFullProfile$: loggedUserFullProfile$.asObservable(),
      updateUsername$: jasmine.createSpy('updateUsername$').and.returnValue(of(void 0)),
      isUsernameAvailable$: jasmine.createSpy('isUsernameAvailable$').and.returnValue(of(true))
    };
    
    await TestBed.configureTestingModule({
      declarations: [CompleteProfileComponent],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatIconModule,
        MatFormEntityComponent,
        BrandPrimaryButtonComponent,
        HeroContentCardComponent,
        ScreenWrapperComponent
      ],
      providers: [
        {provide: Router, useValue: mockRouter},
        {provide: ActivatedRoute, useValue: {}},
        {provide: MatSnackBar, useValue: mockSnackBar},
        {provide: UserManagementService, useValue: mockUserManagementService}
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(CompleteProfileComponent);
    component = fixture.componentInstance;
  });
  
  // ── Init ───────────────────────────────────────────────────────────────────
  
  it('should create', fakeAsync(() => {
    loggedUserFullProfile$.next(null);
    fixture.detectChanges();
    tick();
    expect(component).toBeTruthy();
  }));
  
  it('redirects to /auth/login when no user is logged in', fakeAsync(() => {
    fixture.detectChanges();
    loggedUserFullProfile$.next(null);
    tick();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  }));
  
  it('redirects to /auth/login when user is undefined', fakeAsync(() => {
    fixture.detectChanges();
    loggedUserFullProfile$.next(undefined);
    tick();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  }));
  
  it('redirects to /user/area when user already has a proper username', fakeAsync(() => {
    fixture.detectChanges();
    loggedUserFullProfile$.next({id: '1', username: 'properusername', email: 'a@b.com'});
    tick();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/user/area']);
  }));
  
  it('does NOT redirect when user has a temp username starting with user_', fakeAsync(() => {
    fixture.detectChanges();
    loggedUserFullProfile$.next({id: '1', username: 'user_abc123', email: 'a@b.com'});
    tick();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));
  
  // ── Form validation ────────────────────────────────────────────────────────
  
  it('usernameControl is invalid when empty', () => {
    component.usernameControl.setValue('');
    expect(component.usernameControl.invalid).toBeTrue();
  });
  
  it('usernameControl is invalid when less than 3 characters', () => {
    component.usernameControl.setValue('ab');
    expect(component.usernameControl.invalid).toBeTrue();
  });
  
  it('usernameControl is valid for a proper username', () => {
    component.usernameControl.setValue('validname');
    expect(component.usernameControl.valid).toBeTrue();
  });

  it('exposes username ergonomics through the shared field config', () => {
    expect(component.usernameField.control).toBe(component.usernameControl);
    expect(component.usernameField.ergonomics).toEqual({
      autofocus: true,
      enterkeyhint: 'done'
    });
  });

  it('uses the shared auth shell and branded submit control', fakeAsync(() => {
    fixture.detectChanges();
    loggedUserFullProfile$.next({id: '1', username: 'user_abc123', email: 'a@b.com'});
    tick();
    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;
    expect(nativeElement.querySelector('lib-screen-wrapper.auth-page-shell')).toBeTruthy();
    expect(nativeElement.querySelector('lib-hero-content-card.auth-entry-card')).toBeTruthy();
    expect(nativeElement.querySelector('app-brand-primary-button.auth-submit-button')).toBeTruthy();
    expect(nativeElement.querySelector('mat-card')).toBeNull();
    expect(nativeElement.textContent).toContain('Complete your profile');
    expect(nativeElement.textContent).toContain('Set username');
  }));
  
  it('usernameControl is invalid for usernames with special characters', () => {
    component.usernameControl.setValue('bad name!');
    expect(component.usernameControl.invalid).toBeTrue();
  });

  it('checks username availability for valid usernames', fakeAsync(() => {
    fixture.detectChanges();
    component.usernameControl.setValue('Polyterative');
    tick(350);

    expect(mockUserManagementService.isUsernameAvailable$).toHaveBeenCalledWith('Polyterative');
    expect(component.usernameControl.valid).toBeTrue();
  }));

  it('blocks save when username is already taken', fakeAsync(() => {
    mockUserManagementService.isUsernameAvailable$.and.returnValue(of(false));
    fixture.detectChanges();
    component.usernameControl.setValue('Polyterative');
    tick(350);

    expect(component.usernameControl.hasError('usernameTaken')).toBeTrue();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('That username is already taken');
    component.saveUsername();
    tick();

    expect(mockUserManagementService.updateUsername$).not.toHaveBeenCalled();
  }));

  it('shows check-failed text and blocks save when username availability lookup fails', fakeAsync(() => {
    mockUserManagementService.isUsernameAvailable$.and.returnValue(throwError(() => new Error('lookup failed')));
    fixture.detectChanges();
    component.usernameControl.setValue('Polyterative');
    tick(350);

    expect(component.usernameControl.hasError(component.usernameAvailabilityCheckFailedErrorCode)).toBeTrue();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Username availability could not be checked');
    component.saveUsername();
    tick();

    expect(mockUserManagementService.updateUsername$).not.toHaveBeenCalled();
  }));

  it('ignores stale availability responses for an old username', fakeAsync(() => {
    const oldAvailability$ = new Subject<boolean>();
    mockUserManagementService.isUsernameAvailable$.and.returnValues(
      oldAvailability$.asObservable(),
      of(true)
    );
    fixture.detectChanges();
    component.usernameControl.setValue('oldname');
    tick(350);

    component.usernameControl.setValue('newname');
    oldAvailability$.next(false);

    expect(component.usernameControl.value).toBe('newname');
    expect(component.usernameControl.hasError(component.usernameTakenErrorCode)).toBeFalse();
    expect(mockUserManagementService.updateUsername$).not.toHaveBeenCalled();
  }));

  it('does not check availability until the username format is valid', fakeAsync(() => {
    fixture.detectChanges();
    component.usernameControl.setValue('ab');
    tick(350);

    expect(mockUserManagementService.isUsernameAvailable$).not.toHaveBeenCalled();
  }));
  
  // ── saveUsername ───────────────────────────────────────────────────────────
  
  it('does nothing when form is invalid', fakeAsync(() => {
    component.usernameControl.setValue('');
    component.saveUsername();
    tick();
    expect(mockUserManagementService.updateUsername$).not.toHaveBeenCalled();
  }));
  
  it('does nothing when already saving', fakeAsync(() => {
    component.usernameControl.setValue('validname');
    component.saving = true;
    component.saveUsername();
    tick();
    expect(mockUserManagementService.updateUsername$).not.toHaveBeenCalled();
  }));
  
  it('calls updateUsername$ with trimmed value when form is valid', fakeAsync(() => {
    component.usernameControl.setValue('myname');
    component.saveUsername();
    tick();
    expect(mockUserManagementService.updateUsername$).toHaveBeenCalledWith('myname');
  }));
  
  it('navigates to /user/area after successful save', fakeAsync(() => {
    component.usernameControl.setValue('myname');
    component.saveUsername();
    tick();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/user/area']);
  }));
  
  it('shows taken-username error when updateUsername$ returns already-taken message', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom');
    mockUserManagementService.updateUsername$.and.returnValue(
      throwError(() => new Error('This username is already taken. Please choose another one.'))
    );
    
    component.usernameControl.setValue('takenname');
    component.saveUsername();
    tick();
    
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(
      mockSnackBar,
      jasmine.stringContaining('already taken')
    );
  }));
  
  it('shows generic error when updateUsername$ fails for other reason', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom');
    mockUserManagementService.updateUsername$.and.returnValue(
      throwError(() => new Error('Server error'))
    );
    
    component.usernameControl.setValue('myname');
    component.saveUsername();
    tick();
    
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(
      mockSnackBar,
      jasmine.stringContaining('database returned an error')
    );
  }));
  
  it('resets saving flag on error', fakeAsync(() => {
    mockUserManagementService.updateUsername$.and.returnValue(throwError(() => new Error('fail')));
    
    component.usernameControl.setValue('myname');
    component.saveUsername();
    tick();
    
    expect(component.saving).toBeFalse();
  }));
});
