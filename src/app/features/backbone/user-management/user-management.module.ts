import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { RouterModule } from '@angular/router';
import { TimeagoModule } from 'ngx-timeago';
import { UserManagementComponent } from 'src/app/features/backbone/user-management/user-management.component';
import { EmptyStateModule } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { LabelValueShowcaseModule } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';


@NgModule({
  declarations: [
    UserManagementComponent
  ],
  imports:      [
    CommonModule,
    RouterModule.forRoot([
      {
        path:     'user',
        children: [
          {
            path:      'account',
            component: UserManagementComponent
          }
          // {
          //   path:      'signup',
          //   component: SignupPageComponent
          // }
        ]
      }
    
    ], {scrollPositionRestoration: 'enabled'}),
    MatCardModule,
    FlexLayoutModule,
    HeroContentCardModule,
    BrandPrimaryButtonModule,
    EmptyStateModule,
    ScreenWrapperModule,
    LabelValueShowcaseModule,
    MatTooltipModule,
    TimeagoModule
  
  ],
  exports:      [
    UserManagementComponent
  ]
})
export class UserManagementModule {}