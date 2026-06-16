import {
  Inject,
  Injectable,
  NgZone
} from '@angular/core';
import {
  NavigationEnd,
  Router
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  POSTHOG_CLIENT_LOADER,
  PostHogLoader
} from './posthog-loader';

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
 * PostHog itself is initialized by the shared loader. This service is the only
 * surface the rest of the app talks to — never import the SDK directly.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private routeWired = false;

  constructor(
    private router: Router,
    private zone: NgZone,
    @Inject(POSTHOG_CLIENT_LOADER) private loadPostHog: PostHogLoader
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
    void this.loadPostHog()
      .then(ph => ph?.capture(event, props))
      .catch(() => { /* swallow */ });
  }

  identify(user: MinimalUser | null | undefined): void {
    if (!environment.production) {
      return;
    }
    void this.loadPostHog()
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
    void this.loadPostHog()
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
      this.capturePageview(this.router.url);

      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(event => {
          const url = event.urlAfterRedirects || event.url;
          this.capturePageview(url);
        });
    });
  }

  private capturePageview(url: string): void {
    void this.loadPostHog()
      .then(ph => ph?.capture('$pageview', { $current_url: window.location.origin + url }))
      .catch(() => { /* swallow */ });
  }
}
