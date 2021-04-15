import { NgModule }                         from '@angular/core';
import { RouterModule }                     from '@angular/router';
import { LoginPageComponent }               from './login-page/login-page.component';
import { LoginPageModule }                  from './login-page/login-page.module';
import { SignupPageComponent }              from './signup/signup-page.component';
import { UserManagementIntegrationService } from './user-management-integration.service';


@NgModule({
  declarations: [],
  providers:    [UserManagementIntegrationService],
  imports:      [
    LoginPageModule,
    RouterModule.forRoot([
      {
        path:     'auth',
        children: [
          {
            path:      'login',
            component: LoginPageComponent
          },
          {
            path:      'signup',
            component: SignupPageComponent
          }
        ]
      }
    
    ])
  
  ]
})
export class LoginModule {}
