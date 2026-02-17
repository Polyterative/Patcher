import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterModule
} from '@angular/router';
import { SupabaseService } from '../../../backend/supabase.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule } from "src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module";
import { ScreenWrapperModule } from "src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module";
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SeoAndUtilsService } from '../../seo-and-utils.service';
import { AuthChangeEvent } from '@supabase/supabase-js';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { UserResetPasswordDataService } from './user-reset-password-data.service';
import { timer } from 'rxjs';
import { take } from 'rxjs/operators';
import { CountdownProgressModule } from "src/app/shared-interproject/components/@visual/countdown-progress/countdown-progress.module";


/**
 * Delay before checking recovery session if no auth event is received
 */
const AUTH_CHECK_DELAY_MS = 1000;

@Component({
  selector: 'app-reset-password-page',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatFormEntityComponent,
    BrandPrimaryButtonModule,
    HeroContentCardModule,
    ScreenWrapperModule,
    CountdownProgressModule,
    CountdownProgressModule
  ],
  providers: [SeoAndUtilsService, UserResetPasswordDataService],
  templateUrl: './reset-password-page.component.html',
  styleUrls: ['./reset-password-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordPageComponent extends SubManager implements OnInit {

  constructor(
    private supabaseService: SupabaseService,
    protected router: Router,
    private route: ActivatedRoute,
    private seoAndUtilsService: SeoAndUtilsService,
    public dataService: UserResetPasswordDataService
  ) {
    super();
  }
  
  ngOnInit(): void {
    // Check for token in query params first
    this.checkAndVerifyToken();
    
    this.setupAuthStateListener();
    
    this.seoAndUtilsService.updateSeo({
      title: 'Reset Password',
      description: 'Reset your account password securely.'
    }, 'Reset Password');
  }
  
  /**
   * Check for token_hash in query params and verify with Supabase
   */
  private checkAndVerifyToken(): void {
    this.route.queryParams.pipe(take(1)).subscribe(async (params) => {
      const tokenHash = params['token_hash'];
      const type = params['type'];
      
      console.log('Query params:', {tokenHash, type});
      
      // Also check hash fragment for access_token (Supabase's standard flow)
      const hash = window.location.hash;
      const hashHasToken = hash.includes('access_token=') || hash.includes('access_token%3D');
      const hashHasRecovery = hash.includes('type=recovery') || hash.includes('type%3Drecovery');
      
      console.log('Hash fragment:', {hash, hashHasToken, hashHasRecovery});
      
      if (tokenHash && type === 'recovery') {
        // Token found in query params - verify it
        console.log('Found token_hash in query params, verifying...');
        try {
          const supabaseClient = (this.supabaseService as any).supabase;
          const {data, error} = await supabaseClient.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });
          
          if (error) {
            console.error('Token verification failed:', error);
            this.dataService.errorMessage$.next('Invalid or expired password reset link.');
            this.dataService.setRecoverySession(false);
          } else {
            console.log('Token verified successfully:', data);
            this.dataService.setRecoverySession(true);
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          this.dataService.errorMessage$.next('Failed to verify password reset link.');
          this.dataService.setRecoverySession(false);
        }
      } else if (hashHasToken && hashHasRecovery) {
        // Token in hash fragment - let Supabase handle it automatically
        console.log('Found token in hash fragment, letting Supabase handle it...');
        // Don't set session state yet, wait for PASSWORD_RECOVERY event
      } else {
        // No token found
        console.log('No recovery token found in URL');
      }
    });
  }
  
  /**
   * Set up listener for Supabase auth state changes
   */
  private setupAuthStateListener(): void {
    const supabaseClient = (this.supabaseService as any).supabase;
    
    const {data: authListener} = supabaseClient.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: any) => {
        console.log('Auth state change:', event, session);
        
        if (event === 'PASSWORD_RECOVERY') {
          this.dataService.setRecoverySession(true);
        } else if (event === 'SIGNED_IN') {
          this.dataService.checkForRecoveryInUrl();
        } else {
          // Check if session has not been checked yet
          this.dataService.isSessionChecked$
            .pipe(take(1))
            .subscribe(isChecked => {
              if (!isChecked) {
                this.dataService.checkForRecoveryInUrl();
              }
            });
        }
      }
    );
    
    // Store the subscription and clean it up in ngOnDestroy via SubManager
    if (authListener?.subscription) {
      this.manageSub(authListener.subscription);
    }
    
    // Fallback: check after delay if no auth event is received
    timer(AUTH_CHECK_DELAY_MS)
      .pipe(take(1))
      .subscribe(() => {
        this.dataService.isSessionChecked$
          .pipe(take(1))
          .subscribe(isChecked => {
            if (!isChecked) {
              this.dataService.checkForRecoveryInUrl();
            }
          });
      });
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