import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  PLATFORM_ID,
  ViewChild
} from '@angular/core';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { CaptchaState } from './captcha-state';


interface TurnstileApi {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptLoad: Promise<TurnstileApi> | null = null;

function loadTurnstile(document: Document): Promise<TurnstileApi> {
  if (document.defaultView?.turnstile) return Promise.resolve(document.defaultView.turnstile);
  scriptLoad ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => document.defaultView?.turnstile
      ? resolve(document.defaultView.turnstile)
      : reject(new Error('Turnstile did not initialise'));
    script.onerror = () => {
      scriptLoad = null;
      reject(new Error('Turnstile script failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptLoad;
}


/**
 * Cloudflare Turnstile widget. Invisible unless Cloudflare needs an interaction;
 * writes the token into the bound CaptchaState. Renders nothing when the captcha is disabled or on the server.
 */
@Component({
  selector: 'app-turnstile-widget',
  template: '@if (state?.enabled) {<div #host class="turnstile-host"></div>}',
  styles: [':host { display: block; } .turnstile-host:empty { display: none; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class TurnstileWidgetComponent extends SubManager implements AfterViewInit, OnDestroy {
  @Input({required: true}) state: CaptchaState;
  @Input() action = 'auth';
  @ViewChild('host') private host?: ElementRef<HTMLElement>;

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private widgetId: string | null = null;
  private api: TurnstileApi | null = null;

  ngAfterViewInit(): void {
    if (!this.isBrowser || !this.state?.enabled || !this.host) return;
    const element = this.host.nativeElement;

    loadTurnstile(element.ownerDocument)
      .then(api => {
        if (this.widgetId !== null || !element.isConnected) return;
        this.api = api;
        this.widgetId = api.render(element, {
          sitekey: this.state.siteKey,
          action: this.action,
          appearance: 'interaction-only',
          theme: 'auto',
          size: 'flexible',
          callback: (token: string) => this.state.token$.next(token),
          'expired-callback': () => this.state.token$.next(null),
          'error-callback': () => this.state.token$.next(null)
        });
      })
      .catch(error => console.warn('[turnstile]', error));

    this.state.reset$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => {
        this.state.token$.next(null);
        if (this.api && this.widgetId !== null) this.api.reset(this.widgetId);
      });
  }

  override ngOnDestroy(): void {
    if (this.api && this.widgetId !== null) this.api.remove(this.widgetId);
    this.state?.token$.next(null);
    super.ngOnDestroy();
  }
}
