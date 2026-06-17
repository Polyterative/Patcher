import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ErrorCodes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/app-form-utils';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const USERNAME_PATTERN_MESSAGE = 'Use letters, numbers, underscores, or hyphens only';

export function usernameValidators(): ValidatorFn[] {
  return [
    Validators.required,
    Validators.minLength(USERNAME_MIN_LENGTH),
    Validators.maxLength(USERNAME_MAX_LENGTH),
    Validators.pattern(USERNAME_PATTERN),
  ];
}

export function hasValidUsernameFormat(username: string): boolean {
  const normalizedUsername = username.trim();

  return normalizedUsername.length >= USERNAME_MIN_LENGTH &&
    normalizedUsername.length <= USERNAME_MAX_LENGTH &&
    USERNAME_PATTERN.test(normalizedUsername);
}

export function applyUsernameAvailabilityError(control: AbstractControl, errorCode: string | null): void {
  const errors: ValidationErrors = {...(control.errors ?? {})};
  delete errors[ErrorCodes.form.errorCode.custom.usernameTaken];
  delete errors[ErrorCodes.form.errorCode.custom.usernameAvailabilityCheckFailed];

  if (errorCode) {
    errors[errorCode] = true;
  }

  control.setErrors(Object.keys(errors).length > 0 ? errors : null);
  control.markAsTouched();
}
