import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { RouterModule }             from '@angular/router';
import { EmptyStateModule }         from '../../../../shared-interproject/components/@smart/empty-state/empty-state.module';
import { MatFormEntityModule }      from '../../../../shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from '../../../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule }    from '../../../../shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { ScreenWrapperModule }      from '../../../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { LoginEmailModule }         from '../login-email/login-email.module';
import { LoginPageComponent }       from './login-page.component';


@NgModule({
  declarations: [
    LoginPageComponent
  ],
  imports:      [
    CommonModule,
    MatFormEntityModule,
    BrandPrimaryButtonModule,
    EmptyStateModule,
    ScreenWrapperModule,
    HeroContentCardModule,
    FlexLayoutModule,
    LoginEmailModule,
    RouterModule
  ],
  exports:      [
    LoginPageComponent
  ]
})
export class LoginPageModule {}
