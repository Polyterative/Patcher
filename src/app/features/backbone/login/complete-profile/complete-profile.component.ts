import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import {
  UntypedFormControl,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  NEVER,
  of
} from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  take,
  tap
} from 'rxjs/operators';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { ErrorCodes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/app-form-utils';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { UserManagementService } from '../user-management.service';
import {
  applyUsernameAvailabilityError,
  hasValidUsernameFormat,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN_MESSAGE,
  usernameValidators
} from '../username-validation';


/**
 * Profile Completion Component
 *
 * This component is shown to new OAuth users who need to set their username
 * after signing in with a social provider (Google, Apple, GitHub, etc.)
 *
 * Flow:
 * 1. OAuth user signs in for the first time
 * 2. System creates temporary username
 * 3. User is redirected here to choose a permanent username
 * 4. After setting username, user proceeds to main app
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-complete-profile',
  template: `
    <lib-screen-wrapper sizePreset="full-bleed" class="auth-page-shell">
      <div class="auth-page-shell__inner col gap1">
        <lib-hero-content-card
          titleBig="Complete your profile"
          icon="badge"
          class="auth-entry-card">
          <div class="col gap1">
            <div class="auth-surface">
              <div class="auth-body">
                <div class="auth-container">
                  <lib-mat-form-entity
                    [dataPack]="usernameField"
                    formFieldAppearanceType="fill"
                    (enterPressed)="saveUsername()"
                  ></lib-mat-form-entity>

                  @if (usernameControl.hasError(usernameTakenErrorCode)) {
                    <div class="username-state username-state--error" role="alert">
                      <mat-icon>block</mat-icon>
                      <span>That username is already taken. Pick a different one.</span>
                    </div>
                  } @else if (usernameControl.hasError(usernameAvailabilityCheckFailedErrorCode)) {
                    <div class="username-state username-state--warning" role="alert">
                      <mat-icon>warning</mat-icon>
                      <span>Username availability could not be checked. Try again in a moment.</span>
                    </div>
                  }

                  <app-brand-primary-button
                    class="auth-submit-button"
                    [disabled]="usernameControl.invalid || checkingUsernameAvailability || saving"
                    innerFlex="auto"
                    theme="positive"
                    icon="person"
                    (click$)="saveUsername()">
                    {{ checkingUsernameAvailability ? 'Checking username...' : saving ? 'Setting username...' : 'Set username' }}
                  </app-brand-primary-button>
                </div>
              </div>
            </div>
          </div>
        </lib-hero-content-card>
      </div>
    </lib-screen-wrapper>
  `,
  styleUrl: './complete-profile.component.scss',
  standalone: false
})
export class CompleteProfileComponent extends SubManager implements OnInit {
  readonly usernameControl = new UntypedFormControl('', usernameValidators());

  readonly usernameField: IMatFormEntityConfig = {
    type: FormTypes.TEXT,
    control: this.usernameControl,
    label: 'Username',
    code: 'complete-profile-username',
    flex: '100%',
    hint: `Choose a unique username between ${ USERNAME_MIN_LENGTH }-${ USERNAME_MAX_LENGTH } characters. ${ USERNAME_PATTERN_MESSAGE }.`,
    iconL1: 'person',
    ergonomics: {
      autofocus: true,
      enterkeyhint: 'done'
    }
  };
  
  saving = false;
  checkingUsernameAvailability = false;
  readonly usernameTakenErrorCode = ErrorCodes.form.errorCode.custom.usernameTaken;
  readonly usernameAvailabilityCheckFailedErrorCode = ErrorCodes.form.errorCode.custom.usernameAvailabilityCheckFailed;
  
  constructor(
    private userManagementService: UserManagementService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    super();
  }
  
  ngOnInit(): void {
    this.initializeUsernameAvailabilityCheck();
    // Check if user is already authenticated
    this.userManagementService.loggedUserFullProfile$
      .pipe(take(1))
      .subscribe(user => {
        if (!user) {
          // Not authenticated, redirect to login
          this.router.navigate(['/auth/login']);
        } else if (user.username && !user.username.startsWith('user_')) {
          // Already has a username, redirect to main app
          this.router.navigate(['/user/area']);
        }
      });
  }
  
  saveUsername(): void {
    if (this.checkingUsernameAvailability) {
      SharedConstants.infoCustom(this.snackBar, 'Checking username availability — try again in a moment.');
      return;
    }

    if (this.usernameControl.hasError(ErrorCodes.form.errorCode.custom.usernameTaken)) {
      SharedConstants.errorCustom(this.snackBar, 'That username is already taken — pick a different one.');
      return;
    }

    if (this.usernameControl.invalid || this.saving) {
      return;
    }
    
    this.saving = true;
    const newUsername = this.usernameControl.value!.trim();
    
    this.userManagementService.updateUsername$(newUsername).pipe(
      tap(() => {
        this.router.navigate(['/user/area']);
      }),
      catchError((error) => {
        console.error('Error saving username:', error);
        
        if (error?.code === '23505' || error?.message?.includes('unique') || error?.message?.includes('already taken')) {
          SharedConstants.errorCustom(this.snackBar, 'That username is already taken — pick a different one.');
        } else {
          SharedConstants.errorCustom(this.snackBar, 'Username not saved — the database returned an error. Try again.');
        }
        
        this.saving = false;
        this.cdr.markForCheck();
        return NEVER;
      }),
      this.takeUntilDestroyed()
    ).subscribe({
      complete: () => {
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  private initializeUsernameAvailabilityCheck(): void {
    this.usernameControl.valueChanges.pipe(
      startWith(this.usernameControl.value),
      map(value => `${ value ?? '' }`.trim()),
      distinctUntilChanged(),
      tap(username => {
        applyUsernameAvailabilityError(this.usernameControl, null);
        if (!hasValidUsernameFormat(username)) {
          this.checkingUsernameAvailability = false;
          this.cdr.markForCheck();
        }
      }),
      filter(username => hasValidUsernameFormat(username)),
      tap(() => {
        this.checkingUsernameAvailability = true;
        this.cdr.markForCheck();
      }),
      debounceTime(350),
      switchMap(username =>
        this.userManagementService.isUsernameAvailable$(username).pipe(
          map(isAvailable => ({username, isAvailable, checkFailed: false})),
          catchError(error => {
            console.error('Username availability check failed:', error);
            return of({username, isAvailable: false, checkFailed: true});
          })
        )
      ),
      this.takeUntilDestroyed()
    ).subscribe(({username, isAvailable, checkFailed}) => {
      if (`${ this.usernameControl.value ?? '' }`.trim() !== username) {
        return;
      }
      this.checkingUsernameAvailability = false;
      applyUsernameAvailabilityError(
        this.usernameControl,
        checkFailed
          ? ErrorCodes.form.errorCode.custom.usernameAvailabilityCheckFailed
          : !isAvailable
            ? ErrorCodes.form.errorCode.custom.usernameTaken
            : null
      );
      this.cdr.markForCheck();
    });
  }
}
