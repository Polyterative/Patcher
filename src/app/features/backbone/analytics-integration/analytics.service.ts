import {
  Inject,
  Injectable,
  NgZone
} from '@angular/core';
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  POSTHOG_CLIENT_LOADER,
  PostHogLoader
} from './posthog-loader';
import {
  ViewEntityKind,
  ViewTrackingService
} from './view-tracking.service';

/** Detail-view events that also feed first-party view counting, with their id property. */
const VIEW_EVENTS: Record<string, { kind: ViewEntityKind; idProp: string }> = {
  'module.viewed':            { kind: 'module', idProp: 'module_id' },
  'rack.viewed':              { kind: 'rack', idProp: 'rack_id' },
  'patch.viewed':             { kind: 'patch', idProp: 'patch_id' },
  'manufacturer.viewed':      { kind: 'manufacturer', idProp: 'manufacturer_id' },
  'module_collection.viewed': { kind: 'collection', idProp: 'collection_id' }
};

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
    @Inject(POSTHOG_CLIENT_LOADER) private loadPostHog: PostHogLoader,
    private viewTracking: ViewTrackingService
  ) {
    this.wireRoutePageviews();
  }

  /**
   * Capture a custom product event. Naming convention: `domain.action` in
   * snake_case (e.g. `rack.module_added`). Keep props small, no PII.
   */
  capture(event: string, props?: Record<string, unknown>): void {
    const view = VIEW_EVENTS[event];
    if (view) {
      this.viewTracking.trackEntity(view.kind, props?.[view.idProp]);
    }
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
          this.viewTracking.trackPage(this.currentRouteTemplate());
        });
    });
  }

  /** Matched route config paths joined, e.g. `modules/details/:id` — no ids, no query string. */
  private currentRouteTemplate(): string {
    const parts: string[] = [];
    let node: ActivatedRouteSnapshot | null | undefined = this.router.routerState?.snapshot.root;
    while (node) {
      if (node.routeConfig?.path) {
        parts.push(node.routeConfig.path);
      }
      node = node.firstChild;
    }
    return parts.join('/');
  }

  private capturePageview(url: string): void {
    void this.loadPostHog()
      .then(ph => ph?.capture('$pageview', { $current_url: window.location.origin + url }))
      .catch(() => { /* swallow */ });
  }
}
