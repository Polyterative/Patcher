import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LoginPageComponent } from './login-page/login-page.component';
import { LoginPageModule } from './login-page/login-page.module';
import { SignupPageComponent } from './signup/signup-page.component';
import { SignupPageModule } from './signup/signup-page.module';
import { UserManagementService } from './user-management.service';
import { ResetPasswordPageComponent } from './reset-password/reset-password-page.component';


@NgModule({
  providers: [UserManagementService],
  imports: [
    LoginPageModule,
    SignupPageModule,
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
          }
        ]
      }
    ], {scrollPositionRestoration: 'enabled'})
  ]
})
export class LoginModule {}
