import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { UserLoginDataService } from './user-login-data.service';
import { SeoAndUtilsService } from "src/app/features/backbone/seo-and-utils.service";
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";
import {
  ActivatedRoute,
  Router
} from "@angular/router";
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";
import {
  take
} from "rxjs/operators";
import { SharedConstants } from "src/app/shared-interproject/SharedConstants";
import { MatSnackBar } from "@angular/material/snack-bar";
import { SSOProvider } from '../sso-buttons/sso-buttons.component';


@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class LoginPageComponent extends SubManager implements OnInit, AfterViewChecked {

  @ViewChild('resetErrorMessage') private resetErrorMessageEl?: ElementRef<HTMLElement>;
  private lastFocusedResetErrorMessage = '';

  constructor(
    public dataService: UserLoginDataService,
    private seoAndUtilsService: SeoAndUtilsService,
    public loginInteraction: UserManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    super();
    this.seoAndUtilsService.updateSeo({noindex: true}, 'Login');
  }
  
  ngOnInit(): void {
    this.checkResetSuccessParam();
    this.checkLoggedInUser();
  }

  /**
   * Move focus to the reset-request error message whenever it transitions
   * from empty to non-empty, so assistive technology announces it.
   */
  ngAfterViewChecked(): void {
    const message = this.dataService.resetErrorMessage$.value;
    if (!message) {
      this.lastFocusedResetErrorMessage = '';
      return;
    }
    if (message !== this.lastFocusedResetErrorMessage && this.resetErrorMessageEl) {
      this.lastFocusedResetErrorMessage = message;
      this.resetErrorMessageEl.nativeElement.focus();
    }
  }
  
  /**
   * Check if redirected after successful password reset
   */
  private checkResetSuccessParam(): void {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      if (params['resetSuccess'] === 'true') {
        this.snackBar.open(
          'Password updated — sign in with your new credentials.',
          undefined,
          {duration: 5000, panelClass: 'snack-success'}
        );
      }
    });
  }
  
  /**
   * Check if user is already logged in and redirect
   */
  private checkLoggedInUser(): void {
    this.loginInteraction.loggedUser$
      .pipe(
        take(1),
        this.takeUntilDestroyed()
      )
      .subscribe(user => {
        if (user) {
          SharedConstants.successLogin(this.snackBar);
          this.router.navigate(['/user/area']);
        }
      });
  }
  
  /**
   * Handle SSO login when user selects a provider
   */
  handleSSOLogin(provider: SSOProvider): void {
    this.loginInteraction.loginWithSSO(provider);
  }
  
  protected readonly SharedConstants = SharedConstants;
  
}