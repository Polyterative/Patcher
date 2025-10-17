import {
  Component,
  OnInit
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterModule
} from '@angular/router';
import {
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  Validators
} from '@angular/forms';
import { SupabaseService } from '../../../backend/supabase.service';
import {
  catchError,
  of
} from 'rxjs';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { CommonModule } from '@angular/common';
import { MatFormEntityModule } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule } from "src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module";
import { ScreenWrapperModule } from "src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module";
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SeoAndUtilsService } from '../../seo-and-utils.service';


const ERROR_MESSAGES = SharedConstants.messages.resetPassword;

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatFormEntityModule,
    BrandPrimaryButtonModule,
    HeroContentCardModule,
    ScreenWrapperModule
  ],
  providers: [SeoAndUtilsService],
  templateUrl: './reset-password-page.component.html',
  styleUrls: ['./reset-password-page.component.scss']
})
export class ResetPasswordPageComponent implements OnInit {
  token: string | null = null;
  redirectTo: string | null = null;
  isSubmitting = false;
  errorMessage: string = '';

  formGroup: UntypedFormGroup;

  passwordField: IMatFormEntityConfig = {
    type: FormTypes.PASSWORD_NEW,
    label: ERROR_MESSAGES.resetPasswordButton,
    control: new UntypedFormControl('', [Validators.required]),
    code: 'password',
    flex: '100%'
  };

  confirmPasswordField: IMatFormEntityConfig = {
    type: FormTypes.PASSWORD_NEW,
    label: ERROR_MESSAGES.resetPasswordButton,
    control: new UntypedFormControl('', [Validators.required]),
    code: 'confirmPassword',
    flex: '100%'
  };
  
  sharedConstants = SharedConstants;

  constructor(
    private route: ActivatedRoute,
    private supabaseService: SupabaseService,
    protected router: Router,
    private formBuilder: UntypedFormBuilder,
    private seoAndUtilsService: SeoAndUtilsService
  ) {
    console.log('SeoAndUtilsService instantiated:', !!seoAndUtilsService);
    this.formGroup = this.initializeForm();
  }
  
  ngOnInit(): void {
    this.extractQueryParams();

    if (!this.isTokenValid()) {
      this.showError(ERROR_MESSAGES.invalidToken);
      return;
    }

    if (!this.isRedirectUrlValid()) {
      this.showError(ERROR_MESSAGES.invalidRedirect);
      this.redirectTo = null;
      return;
    }
    
    this.seoAndUtilsService.updateSeo({
      title: 'Reset Password',
      description: 'Reset your account password securely.'
    }, 'Reset Password');
  }
  
  private initializeForm(): UntypedFormGroup {
    return this.formBuilder.group({
      password: this.passwordField.control,
      confirmPassword: this.confirmPasswordField.control
    });
  }
  
  private extractQueryParams(): void {
    const queryParams = this.route.snapshot.queryParamMap;
    this.token = queryParams.get('token') || null;
    this.redirectTo = queryParams.get('redirect_to') || null;
  }
  
  private showError(message: string): void {
    this.errorMessage = message;
    this.isSubmitting = false;
  }
  
  private isTokenValid(): boolean {
    return this.token ? /^[a-f0-9]{64}$/.test(this.token) : false;
  }
  
  private isRedirectUrlValid(): boolean {
    if (!this.redirectTo) return true;
    try {
      const parsedUrl = new URL(this.redirectTo);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }
  
  onSubmit(): void {
    if (this.formGroup.invalid || !this.token) {
      return; // Exit if the form is invalid or the token is missing
    }
    
    const {password, confirmPassword} = this.formGroup.value;
    
    if (password !== confirmPassword) {
      this.showError(ERROR_MESSAGES.passwordMismatch);
      return;
    }
    
    this.isSubmitting = true;
    this.errorMessage = null;
    
    this.supabaseService
      .resetPassword$(this.token, password)
      .pipe(
        catchError((error) => {
          this.showError(error?.message || ERROR_MESSAGES.resetFailed);
          return of(null);
        })
      )
      .subscribe((result) => {
        this.isSubmitting = false;
        if (result === undefined) {
          const redirectUrl = this.redirectTo || '/auth/login';
          this.router.navigate([redirectUrl], {queryParams: {resetSuccess: true}});
        }
      });
  }
  
  protected readonly SharedConstants = SharedConstants;
}
