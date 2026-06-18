import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  applyUsernameAvailabilityError,
  usernameValidators
} from 'src/app/features/backbone/login/username-validation';
import { SeoAndUtilsService } from '../seo-and-utils.service';
import { ScreenWrapperComponent } from '../../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { HeroContentCardComponent } from '../../../shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { LabelValueShowcaseComponent } from '../../../shared-interproject/components/@visual/label-value-showcase/label-value-showcase.component';
import { MatFormField, MatLabel, MatInput, MatError } from '@angular/material/input';
import { NgIf, AsyncPipe, TitleCasePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { BrandPrimaryButtonComponent } from '../../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { MatTooltip } from '@angular/material/tooltip';
import { TimeagoModule } from 'ngx-timeago';
import { SupabaseUtcTimestampPipe } from '../../../shared-interproject/pipes/supabase-utc-timestamp.pipe';
import {
  catchError,
  take
} from 'rxjs/operators';
import { of } from 'rxjs';
import { ErrorCodes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/app-form-utils';


/** Cross-field validator: confirm password must match new password */
export function confirmMatchesNewValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const newPwd = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (newPwd && confirm && newPwd !== confirm) {
      return {confirmMismatch: true};
    }
    return null;
  };
}


@Component({
    selector: 'app-user-management',
    templateUrl: './user-management.component.html',
    styleUrls: ['./user-management.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ScreenWrapperComponent, HeroContentCardComponent, LabelValueShowcaseComponent, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, NgIf, MatError, MatButton, MatIcon, BrandPrimaryButtonComponent, MatTooltip, AsyncPipe, TitleCasePipe, TimeagoModule, SupabaseUtcTimestampPipe]
})
export class UserManagementComponent implements OnInit {
  @Input() ignoreSeo: boolean = false;
  
  editingUsername = false;
  checkingUsernameAvailability = false;
  readonly usernameControl = new FormControl('', usernameValidators());
  
  passwordForm = new FormGroup(
    {
      newPassword: new FormControl('', [Validators.required, Validators.minLength(8)]),
      confirmPassword: new FormControl('', [Validators.required])
    },
    {
      validators: [
        confirmMatchesNewValidator()
      ]
    }
  );
  
  constructor(
    public userManagementService: UserManagementService,
    readonly seoAndUtilsService: SeoAndUtilsService,
    private readonly cdr?: ChangeDetectorRef
  ) { }
  
  ngOnInit(): void {
    if (!this.ignoreSeo) {
      this.seoAndUtilsService.updateSeo({
        title:       'Account Management',
        description: 'Personal account management.'
      }, 'Account Management');
    }
  }
  
  submitPasswordChange(): void {
    if (this.passwordForm.invalid) {
      return;
    }
    const {newPassword} = this.passwordForm.value;
    this.userManagementService.changePassword$.next({newPassword: newPassword!});
    this.passwordForm.reset();
  }
  
  beginUsernameEdit(currentUsername: string): void {
    this.editingUsername = true;
    this.usernameControl.setValue(currentUsername);
    applyUsernameAvailabilityError(this.usernameControl, null);
    this.usernameControl.markAsPristine();
    this.usernameControl.markAsUntouched();
    this.checkingUsernameAvailability = false;
  }
  
  cancelUsernameEdit(): void {
    this.editingUsername = false;
    this.userManagementService.toggleUsernameForm$.next(false);
    this.usernameControl.reset('');
  }

  canSubmitUsernameChange(currentUsername: string): boolean {
    const nextUsername = this.usernameControl.value?.trim() || '';
    return this.usernameControl.valid
      && !this.checkingUsernameAvailability
      && nextUsername !== currentUsername;
  }
  
  submitUsernameChange(currentUsername: string): void {
    const nextUsername = this.usernameControl.value?.trim() || '';
    this.usernameControl.setValue(nextUsername);
    this.usernameControl.updateValueAndValidity();
    if (this.usernameControl.invalid || nextUsername === currentUsername) {
      this.usernameControl.markAsTouched();
      return;
    }

    this.checkingUsernameAvailability = true;
    this.cdr?.markForCheck();
    applyUsernameAvailabilityError(this.usernameControl, null);
    this.userManagementService.isUsernameAvailable$(nextUsername).pipe(
      take(1),
      catchError(error => {
        console.error('Username availability check failed:', error);
        applyUsernameAvailabilityError(this.usernameControl, ErrorCodes.form.errorCode.custom.usernameAvailabilityCheckFailed);
        this.checkingUsernameAvailability = false;
        this.cdr?.markForCheck();
        return of(null);
      })
    ).subscribe(isAvailable => {
      this.checkingUsernameAvailability = false;
      this.cdr?.markForCheck();
      if (isAvailable === null) {
        return;
      }
      if (!isAvailable) {
        applyUsernameAvailabilityError(this.usernameControl, ErrorCodes.form.errorCode.custom.usernameTaken);
        return;
      }
      this.userManagementService.updateUsernameAction$.next(nextUsername);
    });
  }

  isEmailOnlyAccount(authProviders: string[] | null | undefined): boolean {
    return !authProviders || authProviders.every(provider => provider === 'email');
  }

}
