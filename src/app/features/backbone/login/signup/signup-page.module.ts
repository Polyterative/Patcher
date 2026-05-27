import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { RouterModule } from '@angular/router';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { LoginEmailModule } from '../login-page/login-email/login-email.module';
import { SSOButtonsComponent } from '../sso-buttons/sso-buttons.component';
import { SignupEmailComponent } from './signup-email/signup-email.component';
import { SignupPageComponent } from './signup-page.component';
import { MatError } from "@angular/material/input";


@NgModule({
  declarations: [
    SignupPageComponent,
    SignupEmailComponent,
  ],
  imports: [
    CommonModule,
    BrandPrimaryButtonComponent,
    LoginEmailModule,
    HeroContentCardComponent,
    EmptyStateComponent,
    ScreenWrapperComponent,
    FlexLayoutModule,
    MatFormEntityComponent,
    MatCardModule,
    RouterModule,
    MatError,
    SSOButtonsComponent
  ],
  exports: [
    SignupPageComponent,
    SignupEmailComponent,
  ]
})
export class SignupPageModule {}