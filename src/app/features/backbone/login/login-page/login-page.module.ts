import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatCardModule } from "@angular/material/card";
import { RouterModule } from '@angular/router';
import { UserLoginDataService } from 'src/app/features/backbone/login/login-page/user-login-data.service';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { LottieContainerModule } from 'src/app/shared-interproject/components/@smart/lottie-container/lottie-container.module';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { LoginEmailModule } from './login-email/login-email.module';
import { LoginPageComponent } from './login-page.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { SSOButtonsComponent } from '../sso-buttons/sso-buttons.component';


@NgModule({
  declarations: [
    LoginPageComponent,
  ],
  providers:    [UserLoginDataService],
  imports:      [
    CommonModule,
    MatFormEntityComponent,
    BrandPrimaryButtonComponent,
    EmptyStateComponent,
    ScreenWrapperComponent,
    HeroContentCardComponent,
    LoginEmailModule,
    RouterModule,
    MatCardModule,
    LottieContainerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    FormsModule,
    SSOButtonsComponent
  ],
  exports:      [
    LoginPageComponent,
  ]
})
export class LoginPageModule {}