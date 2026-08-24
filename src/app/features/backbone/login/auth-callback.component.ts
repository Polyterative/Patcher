import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import {
  merge,
  Observable,
  of
} from 'rxjs';
import { map } from 'rxjs/operators';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';


/**
 * OAuth Callback Component
 *
 * This component handles the redirect after OAuth authentication from providers
 * like Google, Apple, GitHub, etc.
 *
 * Flow:
 * 1. User is redirected here after authenticating with OAuth provider
 * 2. Component extracts the session from the URL hash/query params
 * 3. Checks if user has a complete profile (username)
 * 4. Redirects to profile completion if needed, otherwise to main app
 *
 * If the callback settles to failure (provider denial, timeout, or a missing
 * session — see `UserManagementService.oauthCallbackFailed$`), the component
 * stays on this route and renders an in-place Failed state instead of
 * spinning indefinitely; the user must explicitly choose "Back to login".
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-auth-callback',
  templateUrl: './auth-callback.component.html',
  styleUrls: ['./auth-callback.component.scss'],
  standalone: false
})
export class AuthCallbackComponent extends SubManager implements OnInit, AfterViewChecked {
  @ViewChild('failedHeading') private failedHeadingEl?: ElementRef<HTMLElement>;
  private hasFocusedFailedHeading = false;
  // Latched once the callback settles to Failed; a late callback success event
  // racing in afterward must never navigate away from the terminal Failed state.
  private hasSettledToFailed = false;

  readonly failed$: Observable<boolean>;

  constructor(
    private userManagementService: UserManagementService,
    private router: Router
  ) {
    super();
    this.failed$ = merge(
      of(false),
      this.userManagementService.oauthCallbackFailed$.pipe(map(() => true))
    );
  }
  
  ngOnInit(): void {
    // Latch failure before wiring callback-success navigation so a late
    // settlement cannot leave the terminal Failed state.
    this.userManagementService.oauthCallbackFailed$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => {
        this.hasSettledToFailed = true;
      });

    // Listen only for the current OAuth callback attempt's own success event.
    this.userManagementService.oauthCallbackSucceeded$
      .pipe(this.takeUntilDestroyed())
      .subscribe(user => {
        if (!this.hasSettledToFailed) {
          // Check if username needs to be set (new OAuth user)
          if (!user.username || user.username.startsWith('user_')) {
            // Redirect to profile completion
            this.router.navigate(['/auth/complete-profile']);
          } else {
            // User has complete profile, go to main app
            this.router.navigate(['/user/area']);
          }
        }
      });
    
    // Trigger the OAuth callback handling
    this.userManagementService.handleOAuthCallback();
  }

  ngAfterViewChecked(): void {
    // Move focus to the Failed heading exactly once per failed settlement,
    // so assistive technology announces it (mirrors login-page's
    // resetErrorMessage focus wiring).
    if (this.failedHeadingEl) {
      if (!this.hasFocusedFailedHeading) {
        this.hasFocusedFailedHeading = true;
        this.failedHeadingEl.nativeElement.focus();
      }
    } else {
      this.hasFocusedFailedHeading = false;
    }
  }

  onBackToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
