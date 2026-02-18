import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { RouterModule } from '@angular/router';
import { EmptyStateModule } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.module';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
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
    BrandPrimaryButtonModule,
    LoginEmailModule,
    HeroContentCardModule,
    EmptyStateModule,
    ScreenWrapperModule,
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