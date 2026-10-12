import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Inject,
  Injectable,
  Injector,
  NgZone,
  OnDestroy,
  PLATFORM_ID
} from '@angular/core';
import { environment } from 'src/environments/environment';
import { SupabaseService } from '../../backend/supabase.service';
import { TrackedViewPayload } from '../../backend/supabase-view-tracking';

export const VIEW_ENTITY_TYPE = {
  module:       1,
  rack:         2,
  patch:        3,
  manufacturer: 4,
  collection:   5,
  page:         9
} as const;

export type ViewEntityKind = Exclude<keyof typeof VIEW_ENTITY_TYPE, 'page'>;

export const VIEW_SOURCE = {
  direct:   0,
  internal: 1,
  search:   2,
  external: 3
} as const;

const FLUSH_INTERVAL_MS = 10_000;
const MAX_QUEUE = 25;
const VISITOR_STORAGE_KEY = 'patcher.view-visitor';
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview/i;
const SEARCH_HOSTS = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|yandex|baidu|startpage|qwant|brave|kagi)\./i;

/**
 * First-party view counting for the self-host Grafana ("What people look at").
 * Plan: internaldocs/workflow/plans/entity-view-tracking.md.
 *
 * A view counts only in a real, visible browser tab, after the page data loaded (callers fire
 * from their load-success path). Views are queued and sent in batches every 10 s and on
 * `pagehide`. Everything runs outside the Angular zone and never throws.
 */
@Injectable({ providedIn: 'root' })
export class ViewTrackingService implements OnDestroy {
  private readonly enabled: boolean;
  private queue: TrackedViewPayload[] = [];
  /** Views fired while the tab was hidden; they count once the tab is first shown. */
  private deferred: TrackedViewPayload[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private disabledForSession = false;
  private pageViews = 0;
  private sessionFallbackId: string | null = null;
  private readonly landingSource: number;
  private readonly onPageHide = () => this.flush(true);
  private readonly onVisibilityChange = () => this.handleVisibilityChange();

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly injector: Injector,
    private readonly zone: NgZone
  ) {
    const view = this.document.defaultView;
    this.enabled = isPlatformBrowser(platformId)
      && environment.production
      && environment.features.viewTrackingEnabled === true
      && !!view
      && !view.navigator.webdriver
      && !BOT_UA.test(view.navigator.userAgent);
    this.landingSource = this.classifyReferrer(this.document.referrer);

    if (this.enabled) {
      this.zone.runOutsideAngular(() => {
        this.timer = setInterval(() => this.flush(false), FLUSH_INTERVAL_MS);
        view!.addEventListener('pagehide', this.onPageHide);
        this.document.addEventListener('visibilitychange', this.onVisibilityChange);
      });
    }
  }

  trackEntity(kind: ViewEntityKind, id: unknown): void {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return;
    }
    // Entities on the landing page share its source; anything after a navigation is internal.
    this.enqueue({ t: VIEW_ENTITY_TYPE[kind], id: numericId, s: this.pageViews <= 1 ? this.landingSource : VIEW_SOURCE.internal });
  }

  /** `route` is the matched route template (e.g. `modules/details/:id`), never the raw URL. */
  trackPage(route: string): void {
    const template = route.replace(/^\/+/, '').slice(0, 200) || 'home';
    const source = this.pageViews++ === 0 ? this.landingSource : VIEW_SOURCE.internal;
    this.enqueue({ t: VIEW_ENTITY_TYPE.page, r: template, s: source });
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.document.defaultView?.removeEventListener('pagehide', this.onPageHide);
    this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private enqueue(event: TrackedViewPayload): void {
    if (!this.enabled || this.disabledForSession) {
      return;
    }
    if (this.document.visibilityState === 'hidden') {
      this.deferred.push(event);
      return;
    }
    this.queue.push(event);
    if (this.queue.length >= MAX_QUEUE) {
      this.flush(false);
    }
  }

  private handleVisibilityChange(): void {
    if (this.document.visibilityState === 'visible') {
      this.queue.push(...this.deferred.splice(0));
    } else {
      this.flush(true);
    }
  }

  private flush(keepalive: boolean): void {
    if (!this.enabled || this.disabledForSession || this.queue.length === 0) {
      return;
    }
    const batch = this.queue.splice(0, MAX_QUEUE);
    const visitor = this.visitorId();
    void this.injector.get(SupabaseService).views.track(visitor, batch, keepalive)
      .then(result => {
        // RPC not deployed yet or revoked (kill switch): stop sending for this page session.
        if (result === 'missing') {
          this.disabledForSession = true;
          this.queue = [];
          this.deferred = [];
        }
      });
  }

  private classifyReferrer(referrer: string): number {
    if (!referrer) {
      return VIEW_SOURCE.direct;
    }
    try {
      const host = new URL(referrer).hostname;
      if (host === this.document.location?.hostname) {
        return VIEW_SOURCE.internal;
      }
      return SEARCH_HOSTS.test(host) ? VIEW_SOURCE.search : VIEW_SOURCE.external;
    } catch {
      return VIEW_SOURCE.direct;
    }
  }

  /** Random id, rotated every UTC day; the server hashes it with a daily salt it later deletes. */
  private visitorId(): string {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const stored = JSON.parse(localStorage.getItem(VISITOR_STORAGE_KEY) ?? 'null') as { d: string; id: string } | null;
      if (stored?.d === today && typeof stored.id === 'string') {
        return stored.id;
      }
      const fresh = { d: today, id: crypto.randomUUID() };
      localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(fresh));
      return fresh.id;
    } catch {
      return this.sessionFallbackId ??= crypto.randomUUID();
    }
  }
}
