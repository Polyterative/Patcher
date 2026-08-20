import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Optional,
  OnInit,
  PLATFORM_ID,
  ResponseInit,
  RESPONSE_INIT
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import {
  filter,
  map,
  switchMap,
  take
} from 'rxjs/operators';
import * as Sentry from '@sentry/angular';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { redirectSsrAware } from 'src/app/services/ssr-redirect';

/**
 * Redirects legacy `/racks/details/:id` URLs to the opaque-token URL.
 *
 * Resolution rules (enforced by the SECURITY DEFINER RPC
 * `resolve_public_rack_legacy_id`):
 *   - Public rack: returns the rack's `public_id` → redirect to `/racks/<token>`.
 *   - Private rack or non-existent: returns NULL → redirect to `/links/retired`.
 *
 * This intentionally breaks legacy private share links. Old enumerable
 * numeric IDs were leaking private rack metadata; private holders must
 * re-issue a new token URL.
 */
@Component({
  selector: 'app-legacy-rack-redirect',
  template: '<div style="padding:2rem;text-align:center;">Redirecting…</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class LegacyRackRedirectComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backend: SupabaseService,
    @Inject(PLATFORM_ID) private platformId: object,
    @Optional() @Inject(RESPONSE_INIT) private responseInit: ResponseInit | null
  ) {}

  ngOnInit(): void {
    const isBrowser = isPlatformBrowser(this.platformId);
    this.route.params
      .pipe(
        map(p => parseInt(p.id, 10)),
        filter(id => Number.isFinite(id) && id > 0),
        take(1),
        switchMap(legacyId => this.backend.GET.resolvePublicRackLegacyId(legacyId).pipe(
          map(res => ({legacyId, res}))
        ))
      )
      .subscribe(({legacyId, res}) => {
        const token = res?.data;
        if (typeof token === 'string' && token.length > 0) {
          this.addLegacyRedirectBreadcrumb('legacy_redirect_public', legacyId);
          redirectSsrAware({
            isBrowser,
            router: this.router,
            responseInit: this.responseInit,
            url: `/racks/${ token }`,
            statusCode: 301
          });
        } else {
          this.addLegacyRedirectBreadcrumb('legacy_redirect_unavailable', legacyId);
          redirectSsrAware({
            isBrowser,
            router: this.router,
            responseInit: this.responseInit,
            url: '/links/retired',
            statusCode: 302
          });
        }
      });
  }

  private addLegacyRedirectBreadcrumb(message: 'legacy_redirect_public' | 'legacy_redirect_unavailable', legacyId: number): void {
    Sentry.addBreadcrumb({
      category: 'routing',
      level:    'info',
      message,
      data:     {legacyId}
    });
  }
}
