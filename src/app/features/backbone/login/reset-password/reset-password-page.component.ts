import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
import {
  ActivatedRoute,
  Params,
  Router,
  RouterModule
} from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HeroContentCardComponent } from "src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component";
import { ScreenWrapperComponent } from "src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component";
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SeoAndUtilsService } from '../../seo-and-utils.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { UserResetPasswordDataService } from './user-reset-password-data.service';
import { take } from 'rxjs/operators';
import { CountdownProgressModule } from "src/app/shared-interproject/components/@visual/countdown-progress/countdown-progress.module";


@Component({
  selector: 'app-reset-password-page',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatFormEntityComponent,
    BrandPrimaryButtonComponent,
    HeroContentCardComponent,
    ScreenWrapperComponent,
    CountdownProgressModule
  ],
  providers: [SeoAndUtilsService, UserResetPasswordDataService],
  templateUrl: './reset-password-page.component.html',
  styleUrls: ['./reset-password-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordPageComponent extends SubManager implements OnInit {

  constructor(
    protected router: Router,
    private route: ActivatedRoute,
    private seoAndUtilsService: SeoAndUtilsService,
    public dataService: UserResetPasswordDataService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    super();
  }
  
  ngOnInit(): void {
    // Recovery tokens are single-use: only the browser may verify them.
    // Running verification during SSR consumed the token server-side, so the
    // browser's own verification always failed with otp_expired. All
    // verification/event access is delegated to `UserResetPasswordDataService`
    // (which itself re-applies this same gate for its own restore/listener
    // logic) — this component never touches Supabase directly.
    if (isPlatformBrowser(this.platformId)) {
      this.checkAndVerifyToken();
    }
    
    this.seoAndUtilsService.updateSeo({
      title: 'Reset Password',
      description: 'Reset your account password securely.',
      noindex: true
    }, 'Reset Password');
  }
  
  /**
   * Check for token_hash in query params and delegate verification to the
   * data service. The hash-fragment shape (Supabase's implicit-grant flow)
   * needs no explicit trigger here — it is auto-processed by the SDK and
   * observed centrally via `SupabaseService.auth.passwordRecoverySession$`,
   * which the data service already subscribes to on construction.
   */
  private checkAndVerifyToken(): void {
    this.route.queryParams.pipe(take(1)).subscribe((params) => {
      const tokenHash = params['token_hash'];
      const type = params['type'];

      if (tokenHash && type === 'recovery') {
        // This specific verification attempt always independently settles
        // `isSessionChecked$` (success or failure) — the bounded Invalid
        // fallback must never also be armed here, or it could race a
        // genuinely slow-but-valid verification and flash Invalid first
        // (R6/R7).
        this.verifyAndScrubOnSuccess(tokenHash, params);
      } else {
        this.concludeInvalidIfNeverChecked();
      }
    });
  }

  /**
   * If nothing else ever settles `isSessionChecked$` (no marker matched at
   * construction, no `token_hash` in the URL, no hash-based SDK event
   * observed), fail closed to the Invalid state once the SDK's own auth
   * initialization for this page load has genuinely settled — never a fixed
   * wall-clock guess (R12). `authInitializationSettled$` only resolves once
   * `getSettledAuthSession$` has concluded *and* one further deterministic
   * tick has passed, guaranteeing any already-scheduled implicit/hash
   * `PASSWORD_RECOVERY` notification has already run — so a slow-but-
   * legitimate hash recovery can never be preempted by a false Invalid
   * conclusion, however long its own network round trip took. Only ever
   * armed when there is no token to verify — see `checkAndVerifyToken` (R6).
   */
  private concludeInvalidIfNeverChecked(): void {
    this.dataService.authInitializationSettled$
      .pipe(take(1), this.takeUntilDestroyed())
      .subscribe(() => {
        if (!this.dataService.isSessionChecked$.value) {
          this.dataService.setRecoverySession(false);
        }
      });
  }

  /**
   * Triggers verification for this specific token and scrubs the now-
   * consumed `token_hash`/`type` query params from the visible URL only if
   * *this* verification attempt succeeds (ST-13) — never based on the
   * aggregate `isRecoverySession$`/`isSessionChecked$` state, which a
   * concurrent, unrelated marker-restore could flip independently and would
   * otherwise let a pre-existing marker scrub a fresh token's URL before
   * that token's own verification later fails (R8/R9). No scrub, no
   * navigation, on failure: the existing invalid-link state is unaffected.
   */
  private verifyAndScrubOnSuccess(tokenHash: string, params: Params): void {
    this.dataService.verifyRecoveryToken$(tokenHash)
      .pipe(this.takeUntilDestroyed())
      .subscribe(succeeded => {
        if (succeeded) {
          this.scrubRecoveryUrl(params);
        }
      });
  }

  private scrubRecoveryUrl(params: Params): void {
    if (typeof window === 'undefined' || typeof history === 'undefined') return;

    const remainingParams: Record<string, string> = {...params};
    delete remainingParams['token_hash'];
    delete remainingParams['type'];

    const query = new URLSearchParams(remainingParams).toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    history.replaceState(history.state, '', nextUrl);
  }
  
  /**
   * Handle password reset form submission
   */
  onSubmit(): void {
    this.dataService.submitPasswordReset$.next();
  }
  
  /**
   * Navigate to login page
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
  
  /**
   * Navigate to login page after successful password reset
   */
  goToLoginAfterReset(): void {
    this.dataService.performRedirect();
  }
  
  protected readonly SharedConstants = SharedConstants;
}
