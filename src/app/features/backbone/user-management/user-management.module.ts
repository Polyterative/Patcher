import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatCardModule }            from '@angular/material/card';
import { RouterModule }             from '@angular/router';
import { UserManagementComponent }  from 'src/app/features/backbone/user-management/user-management.component';
import { EmptyStateModule }         from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule }    from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { ScreenWrapperModule }      from '../../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';


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
    ScreenWrapperModule
  
  ],
  exports:      [
    UserManagementComponent
  ]
})
export class UserManagementModule {}
