import {
  Injectable,
  NgZone
} from '@angular/core';
import {
  NavigationEnd,
  Router
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

type SentryBrowser = typeof import('@sentry/browser');

interface MinimalUser {
  id?: string;
  email?: string;
  username?: string;
}

/**
 * Centralizes Sentry context wiring (user identity, route tag, manual error
 * capture). Lazy-loads `@sentry/browser` once so it stays out of the main
 * chunk; no-op in non-production builds.
 *
 * Sentry itself is initialized in `src/main.ts`. This service only enriches
 * the events that init produces.
 */
@Injectable({ providedIn: 'root' })
export class SentryContextService {
  private sentryPromise?: Promise<SentryBrowser | null>;
  private routeTagWired = false;

  constructor(
    private router: Router,
    private zone: NgZone
  ) {
    this.wireRouteTag();
  }

  setUser(user: MinimalUser | null | undefined): void {
    if (!environment.production) {
      return;
    }

    void this.getSentry()
      .then(sentry => {
        if (!sentry) {
          return;
        }
        if (!user || !user.id) {
          sentry.setUser(null);
          return;
        }
        sentry.setUser({
          id:       user.id,
          email:    user.email,
          username: user.username
        });
      })
      .catch(() => { /* swallow */ });
  }

  clearUser(): void {
    this.setUser(null);
  }

  /**
   * Manual error capture for `catchError(...)` paths where we suppress an
   * error to keep the UI alive but still want triage signal in Sentry.
   */
  captureError(error: unknown, context?: Record<string, unknown>): void {
    if (!environment.production) {
      console.error('[sentry-context] captureError', error, context);
      return;
    }

    void this.getSentry()
      .then(sentry => {
        if (!sentry) {
          return;
        }
        sentry.captureException(error, context ? { extra: context } : undefined);
      })
      .catch(() => { /* swallow */ });
  }

  private wireRouteTag(): void {
    if (this.routeTagWired || !environment.production) {
      return;
    }
    this.routeTagWired = true;

    // Run outside Angular zone so route tagging never schedules change
    // detection. Sentry calls are side-effect-only.
    this.zone.runOutsideAngular(() => {
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(event => {
          const url = (event.urlAfterRedirects || event.url).split('?')[0].split('#')[0];
          void this.getSentry()
            .then(sentry => sentry?.setTag('route', url))
            .catch(() => { /* swallow */ });
        });
    });
  }

  private getSentry(): Promise<SentryBrowser | null> {
    if (!environment.production) {
      return Promise.resolve(null);
    }
    this.sentryPromise ??= import('@sentry/browser').catch(loadError => {
      console.warn('Sentry context load failed:', loadError);
      return null;
    });
    return this.sentryPromise;
  }
}
