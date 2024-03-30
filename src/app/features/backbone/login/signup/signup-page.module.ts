import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { RouterModule } from '@angular/router';
import { EmptyStateModule } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.module';
import { MatFormEntityModule } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { LoginEmailModule } from '../login-page/login-email/login-email.module';
import { SignupEmailComponent } from './signup-email/signup-email.component';
import { SignupGoogleComponent } from './signup-google/signup-google.component';
import { SignupPageComponent } from './signup-page.component';


@NgModule({
  declarations: [
    SignupPageComponent,
    SignupEmailComponent,
    SignupGoogleComponent
  ],
  imports:      [
    CommonModule,
    BrandPrimaryButtonModule,
    LoginEmailModule,
    HeroContentCardModule,
    EmptyStateModule,
    ScreenWrapperModule,
    FlexLayoutModule,
    MatFormEntityModule,
    MatFormFieldModule,
    MatCardModule,
    RouterModule
  ],
  exports:      [
    SignupPageComponent,
    SignupEmailComponent,
    SignupGoogleComponent
  ]
})
export class SignupPageModule {}