import {
  Component,
  OnInit
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
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
 */
@Component({
  selector: 'app-auth-callback',
  template: `
    <div class="auth-callback-container">
      <div class="spinner-container">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Completing sign in...</p>
      </div>
    </div>
  `,
  styles: [`
      .auth-callback-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          width: 100vw;
      }

      .spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
      }

      .spinner-container p {
          font-size: 1rem;
          color: #666;
      }
  `],
  standalone: false
})
export class AuthCallbackComponent extends SubManager implements OnInit {
  
  constructor(
    private userManagementService: UserManagementService,
    private router: Router
  ) {
    super();
  }
  
  ngOnInit(): void {
    // Listen for successful authentication
    this.userManagementService.loggedUserFullProfile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
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
}