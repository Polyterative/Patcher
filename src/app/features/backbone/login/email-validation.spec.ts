import { UntypedFormControl } from '@angular/forms';
import {
  emailValidators,
  hasValidEmailFormat
} from './email-validation';


describe('email-validation', () => {
  describe('hasValidEmailFormat', () => {
    it('accepts a plain single-label domain', () => {
      expect(hasValidEmailFormat('username@domain.tld')).toBeTrue();
    });

    it('accepts subdomain addresses', () => {
      expect(hasValidEmailFormat('username@sub.domain.tld')).toBeTrue();
      expect(hasValidEmailFormat('user@mail.example.co.uk')).toBeTrue();
      expect(hasValidEmailFormat('a.b+c@sub.domain.io')).toBeTrue();
    });

    it('rejects addresses without a domain dot', () => {
      expect(hasValidEmailFormat('user@domain')).toBeFalse();
      expect(hasValidEmailFormat('user@')).toBeFalse();
    });

    it('rejects addresses without @, with spaces, or empty', () => {
      expect(hasValidEmailFormat('not-an-email')).toBeFalse();
      expect(hasValidEmailFormat('user @domain.tld')).toBeFalse();
      expect(hasValidEmailFormat('user@domain .tld')).toBeFalse();
      expect(hasValidEmailFormat('')).toBeFalse();
    });
  });

  describe('emailValidators', () => {
    function validate(value: string): boolean {
      const control = new UntypedFormControl('', emailValidators());
      control.setValue(value);
      return control.valid;
    }

    it('marks subdomain addresses as valid', () => {
      expect(validate('username@sub.domain.tld')).toBeTrue();
    });

    it('marks empty and malformed addresses as invalid', () => {
      expect(validate('')).toBeFalse();
      expect(validate('not-an-email')).toBeFalse();
      expect(validate('user@domain')).toBeFalse();
    });
  });
});
