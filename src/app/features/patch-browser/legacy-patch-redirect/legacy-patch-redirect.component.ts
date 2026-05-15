import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
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

/**
 * Redirects legacy `/patches/details/:id` URLs to the opaque-token URL.
 * See LegacyRackRedirectComponent for the full rationale — same logic
 * applies to patches.
 */
@Component({
  selector: 'app-legacy-patch-redirect',
  template: '<div style="padding:2rem;text-align:center;">Redirecting…</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class LegacyPatchRedirectComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backend: SupabaseService
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(
        map(p => parseInt(p.id, 10)),
        filter(id => Number.isFinite(id) && id > 0),
        take(1),
        switchMap(legacyId => this.backend.GET.resolvePublicPatchLegacyId(legacyId).pipe(
          map(res => ({legacyId, res}))
        ))
      )
      .subscribe(({legacyId, res}) => {
        const token = res?.data;
        if (typeof token === 'string' && token.length > 0) {
          this.addLegacyRedirectBreadcrumb('legacy_redirect_public', legacyId);
          this.router.navigateByUrl(`/patches/${ token }`, {replaceUrl: true});
        } else {
          this.addLegacyRedirectBreadcrumb('legacy_redirect_unavailable', legacyId);
          this.router.navigate(['/links/retired'], {replaceUrl: true});
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
