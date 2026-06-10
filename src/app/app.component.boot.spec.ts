import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import {
  APP_ROOT_IMPORTS,
  APP_ROOT_PROVIDERS
} from './app.module';


/**
 * Re-throwing ErrorHandler used to unmask DI failures that the production
 * LazySentryErrorHandler quietly buffers for Sentry transport. Without
 * this override the test would silently pass even when AppComponent's
 * tree threw NG0201 mid-render — exactly the failure mode we are trying
 * to catch here.
 */
class RethrowingErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    throw error instanceof Error ? error : new Error(String(error));
  }
}


/**
 * Cold-boot regression guard for the root component tree.
 *
 * Boots AppComponent through the SAME imports + providers AppModule wires
 * into the root injector in production (APP_ROOT_IMPORTS / APP_ROOT_PROVIDERS
 * are re-exported from app.module.ts), minus the `bootstrap: [AppComponent]`
 * declaration TestBed rejects for standalone components.
 *
 * Catches the "FooterComponent renders -> | timeago pipe constructed ->
 * TimeagoFormatter missing in root injector -> NG0201 -> blank page in
 * production" class of bug that shipped when commit decf7458 removed
 * HomeModule from BackboneModule and broke the transitive provider chain.
 *
 * Lives inside the existing `pnpm test:unit:ci` karma run — no browser
 * automation, no extra CI minutes. If APP_ROOT_IMPORTS or
 * APP_ROOT_PROVIDERS is ever edited to drop a root-injector dependency
 * the shell relies on, this spec fails with the exact NG0201 token.
 */
describe('AppComponent — cold boot smoke (real root injector)', () => {
  beforeEach(() => {
    spyOn(window, 'matchMedia').and.returnValue({
      matches:             false,
      media:               '(prefers-reduced-motion: reduce)',
      onchange:            null,
      addListener:         () => undefined,
      removeListener:      () => undefined,
      addEventListener:    () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent:       () => false
    });
  });

  it('renders the shell + footer without throwing from the root injector', async () => {
    await TestBed.configureTestingModule({
      imports: [...APP_ROOT_IMPORTS],
      providers: [
        ...APP_ROOT_PROVIDERS,
        // Last-wins: override the lazy Sentry error handler with one that
        // re-throws, so any NG0201 (missing root provider) blows up the
        // spec instead of disappearing into the Sentry buffer.
        {provide: ErrorHandler, useClass: RethrowingErrorHandler}
      ]
    }).compileComponents();

    // Direct sanity probe — most cold-boot NG0201s happen because a class
    // like TimeagoFormatter has no @Injectable({providedIn:'root'}) and
    // relies on a module-level forRoot() to register the provider. Probe
    // it explicitly: if TestBed.inject throws, we lock in the diagnosis
    // before the (more opaque) view tree even renders.
    const { TimeagoFormatter } = await import('ngx-timeago');
    expect(() => TestBed.inject(TimeagoFormatter))
      .withContext('TimeagoFormatter must be provided at root (TimeagoModule.forRoot() in AppModule)')
      .not.toThrow();

    const fixture = TestBed.createComponent(AppComponent);

    // detectChanges() instantiates FooterComponent and constructs the
    // | timeago pipe — the exact code path that throws NG0201 when a
    // root provider is missing. Pass means the cold-boot shell is wired
    // up correctly.
    expect(() => fixture.detectChanges()).not.toThrow();

    const footer = fixture.nativeElement.querySelector('app-footer') as HTMLElement | null;
    expect(footer).withContext('FooterComponent must render inside AppComponent').not.toBeNull();
    const text = footer!.textContent ?? '';
    console.log('[boot-spec] footer text:', JSON.stringify(text.trim().slice(0, 300)));
    expect(text.trim().length)
      .withContext('Footer must render content; empty footer means a pipe/component aborted mid-render')
      .toBeGreaterThan(0);
    // Specifically guard the timeago pipe — if TimeagoFormatter wasn't
    // provided at root the pipe silently emits empty text and the rest of
    // the footer still renders, so a generic "non-empty" check passes
    // even with the regression. Assert the relative-time substring.
    expect(text).withContext('| timeago pipe must produce a relative-time string').toMatch(/ago|second|minute|hour|day|month|year/i);
  });
});
