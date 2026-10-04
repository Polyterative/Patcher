import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { environment } from 'src/environments/environment';


/**
 * Turnstile token holder owned by a form's data service and bound to `<app-turnstile-widget>`.
 * Tokens are single-use: call `reset$.next()` after every submit attempt.
 */
export class CaptchaState {
  readonly token$ = new BehaviorSubject<string | null>(null);
  readonly reset$ = new Subject<void>();

  constructor(readonly siteKey: string = environment.turnstileSiteKey) {}

  get enabled(): boolean {
    return !!this.siteKey;
  }

  /** Token to send, `undefined` when the captcha is disabled (supabase-js then omits it). */
  get tokenForRequest(): string | undefined {
    return this.enabled ? this.token$.value ?? undefined : undefined;
  }

  /** True when the form may submit: captcha disabled, or a token is ready. */
  get ready(): boolean {
    return !this.enabled || !!this.token$.value;
  }
}
