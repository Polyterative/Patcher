import { FormControl } from '@angular/forms';
import { ErrorCodes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/app-form-utils';
import {
  applyUsernameAvailabilityError,
  hasValidUsernameFormat,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  usernameValidators
} from './username-validation';

function validate(value: unknown): Record<string, unknown> | null {
  const control = new FormControl(value, usernameValidators());
  return control.errors;
}

describe('username validation', () => {
  const valid = ['abc', 'a_b', 'a-b', 'a.b', 'first.last', 'a.b.c', 'A1_-', '123', 'x'.repeat(USERNAME_MAX_LENGTH), '___', '---', '_.-'];
  const invalid = [
    '', 'ab', '.abc', 'abc.', 'a..b', '..', 'a b', 'a@b', 'a/b', 'a\\b', 'a:b', 'a;b', "a'b", 'a"b', 'a<b>',
    'ab\n', '\nabc', 'abc\n', 'abc\r\n', 'a\tb', 'a\u0000b', 'a​b', 'ａｂｃ', 'аbc', 'ñandú', 'user😀', '../etc', '%41bc',
    'x'.repeat(USERNAME_MAX_LENGTH + 1), 'a.', '.a.b', 'a.b.', 'admin‮'
  ];

  for (const name of valid) {
    it(`accepts ${JSON.stringify(name)}`, () => {
      expect(validate(name)).toBeNull();
      expect(hasValidUsernameFormat(name)).toBeTrue();
    });
  }

  for (const name of invalid) {
    it(`rejects ${JSON.stringify(name)} in the form validator`, () => {
      expect(validate(name)).not.toBeNull();
    });
  }

  it('has an inclusive 3..30 length window', () => {
    expect(USERNAME_MIN_LENGTH).toBe(3);
    expect(USERNAME_MAX_LENGTH).toBe(30);
    expect(hasValidUsernameFormat('a'.repeat(2))).toBeFalse();
    expect(hasValidUsernameFormat('a'.repeat(3))).toBeTrue();
    expect(hasValidUsernameFormat('a'.repeat(30))).toBeTrue();
    expect(hasValidUsernameFormat('a'.repeat(31))).toBeFalse();
  });

  it('hasValidUsernameFormat trims outer whitespace while the form validator does not', () => {
    expect(hasValidUsernameFormat('  abc  ')).toBeTrue();
    expect(validate('  abc  ')).not.toBeNull();
  });

  it('hasValidUsernameFormat still rejects internal whitespace, empty and whitespace-only values', () => {
    expect(hasValidUsernameFormat('a b c')).toBeFalse();
    expect(hasValidUsernameFormat('')).toBeFalse();
    expect(hasValidUsernameFormat('     ')).toBeFalse();
  });

  it('required fires for null, undefined and empty', () => {
    for (const value of [null, undefined, '']) {
      expect(validate(value)?.['required']).toBeTrue();
    }
  });

  describe('applyUsernameAvailabilityError', () => {
    const taken = ErrorCodes.form.errorCode.custom.usernameTaken;
    const checkFailed = ErrorCodes.form.errorCode.custom.usernameAvailabilityCheckFailed;

    it('sets the given error, marks touched, and keeps unrelated errors', () => {
      const control = new FormControl('ab', usernameValidators());
      applyUsernameAvailabilityError(control, taken);
      expect(control.errors?.[taken]).toBeTrue();
      expect(control.errors?.['minlength']).toBeDefined();
      expect(control.touched).toBeTrue();
    });

    it('clears stale availability errors when the code is null', () => {
      const control = new FormControl('validname');
      applyUsernameAvailabilityError(control, taken);
      applyUsernameAvailabilityError(control, null);
      expect(control.errors).toBeNull();
    });

    it('swaps one availability error for the other, never both', () => {
      const control = new FormControl('validname');
      applyUsernameAvailabilityError(control, taken);
      applyUsernameAvailabilityError(control, checkFailed);
      expect(control.errors?.[taken]).toBeUndefined();
      expect(control.errors?.[checkFailed]).toBeTrue();
    });
  });
});
