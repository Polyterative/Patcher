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

type PostHogModule = typeof import('posthog-js');
type PostHog = PostHogModule['default'];

interface MinimalUser {
  id?: string;
  email?: string;
  username?: string;
}

/**
 * Centralizes PostHog product analytics wiring (identity, route pageviews,
 * custom event capture). Lazy-loads `posthog-js` once so it stays out of the
 * main chunk; no-op outside production.
 *
 * PostHog itself is initialized in `src/main.ts`. This service is the only
 * surface the rest of the app talks to — never import `posthog-js` directly.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private posthogPromise?: Promise<PostHog | null>;
  private routeWired = false;

  constructor(
    private router: Router,
    private zone: NgZone
  ) {
    this.wireRoutePageviews();
  }

  /**
   * Capture a custom product event. Naming convention: `domain.action` in
   * snake_case (e.g. `rack.module_added`). Keep props small, no PII.
   */
  capture(event: string, props?: Record<string, unknown>): void {
    if (!environment.production) {
      return;
    }
    void this.getPostHog()
      .then(ph => ph?.capture(event, props))
      .catch(() => { /* swallow */ });
  }

  identify(user: MinimalUser | null | undefined): void {
    if (!environment.production) {
      return;
    }
    void this.getPostHog()
      .then(ph => {
        if (!ph) {
          return;
        }
        if (!user || !user.id) {
          return;
        }
        ph.identify(user.id, {
          email:    user.email,
          username: user.username
        });
      })
      .catch(() => { /* swallow */ });
  }

  /**
   * Drop identity and start a fresh anonymous distinct_id. Call on logout.
   */
  reset(): void {
    if (!environment.production) {
      return;
    }
    void this.getPostHog()
      .then(ph => ph?.reset())
      .catch(() => { /* swallow */ });
  }

  private wireRoutePageviews(): void {
    if (this.routeWired || !environment.production) {
      return;
    }
    this.routeWired = true;

    // Outside Angular zone — pageview capture must never schedule change
    // detection.
    this.zone.runOutsideAngular(() => {
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(event => {
          const url = event.urlAfterRedirects || event.url;
          void this.getPostHog()
            .then(ph => ph?.capture('$pageview', { $current_url: window.location.origin + url }))
            .catch(() => { /* swallow */ });
        });
    });
  }

  private getPostHog(): Promise<PostHog | null> {
    if (!environment.production) {
      return Promise.resolve(null);
    }
    this.posthogPromise ??= import('posthog-js')
      .then(mod => mod.default)
      .catch(loadError => {
        console.warn('PostHog load failed:', loadError);
        return null;
      });
    return this.posthogPromise;
  }
}
