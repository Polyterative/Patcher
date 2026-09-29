import {
  ValidatorFn,
  Validators
} from '@angular/forms';

/**
 * Shared email format shared by the auth forms (signup, login, password reset).
 *
 * Deliberately permissive on purpose: the domain part allows any number of
 * dot-separated labels (`user@sub.domain.tld`, `user@mail.example.co.uk`)
 * and mirrors the backend `isValidEmail` check, so the client never rejects
 * an address the backend would accept. Supabase remains the source of truth
 * for deliverability; this validator only catches obvious typos early.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValidators(): ValidatorFn[] {
  return [
    Validators.required,
    Validators.pattern(EMAIL_PATTERN),
  ];
}

export function hasValidEmailFormat(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}
