import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { LoginPageComponent } from './login-page/login-page.component';
import { LoginPageModule } from './login-page/login-page.module';
import { SignupPageComponent } from './signup/signup-page.component';
import { SignupPageModule } from './signup/signup-page.module';
import { UserManagementService } from './user-management.service';
import { ResetPasswordPageComponent } from './reset-password/reset-password-page.component';
import { AuthCallbackComponent } from 'src/app/features/backbone/login/auth-callback.component';
import { CompleteProfileComponent } from './complete-profile/complete-profile.component';
import { SSOButtonsComponent } from './sso-buttons/sso-buttons.component';


@NgModule({
  declarations: [
    AuthCallbackComponent,
    CompleteProfileComponent
  ],
  providers: [UserManagementService],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatFormEntityComponent,
    LoginPageModule,
    SignupPageModule,
    SSOButtonsComponent,
    RouterModule.forRoot([
      {
        path: 'auth',
        children: [
          {
            path: 'login',
            component: LoginPageComponent
          },
          {
            path: 'signup',
            component: SignupPageComponent
          },
          {
            path: 'reset-password',
            component: ResetPasswordPageComponent
          },
          {
            path: 'callback',
            component: AuthCallbackComponent
          },
          {
            path: 'complete-profile',
            component: CompleteProfileComponent
          }
        ]
      }
    ], {scrollPositionRestoration: 'enabled'})
  ]
})
export class LoginModule {}
