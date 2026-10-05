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

describe('email validation — adversarial inputs', () => {
  const accepted = ['a@b.co', 'first.last@sub.example.co.uk', 'a+tag@example.com', "o'neil@example.com", 'a@b.c.d.e', '  a@b.co  '];
  const rejected = [
    '', ' ', 'a', 'a@', '@b.co', 'a@b', 'a@b.', 'a@.co', 'a b@c.co', 'a@b c.co', 'a@@b.co', 'a@b@c.co',
    'a\n@b.co', 'a@b.co\r\nBcc: x@y.z', 'a@b.co,c@d.co', 'a@b.co;c@d.co', '@@.'
  ];

  for (const email of accepted) {
    it(`accepts ${JSON.stringify(email)}`, () => {
      expect(hasValidEmailFormat(email)).toBeTrue();
    });
  }

  for (const email of rejected) {
    it(`rejects ${JSON.stringify(email)}`, () => {
      expect(hasValidEmailFormat(email)).withContext(email).toBeFalse();
    });
  }

  it('trims surrounding whitespace, including a trailing newline, before matching', () => {
    expect(hasValidEmailFormat('a@b.co\n')).toBeTrue();
  });

  it('is intentionally permissive about label content (parity with the backend check)', () => {
    expect(hasValidEmailFormat('a@b..')).toBeTrue();
    expect(hasValidEmailFormat('<a@b.co>')).toBeTrue();
  });

  it('does not catastrophically backtrack on pathological input', () => {
    const start = performance.now();
    hasValidEmailFormat('a'.repeat(50_000) + '@' + 'b'.repeat(50_000));
    hasValidEmailFormat('@'.repeat(50_000));
    hasValidEmailFormat('a@' + '.'.repeat(50_000));
    expect(performance.now() - start).toBeLessThan(500);
  });
});
