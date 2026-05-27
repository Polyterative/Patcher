import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TimeagoModule } from 'ngx-timeago';
import { UserManagementComponent } from 'src/app/features/backbone/user-management/user-management.component';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { LabelValueShowcaseComponent } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { InputDialogModule } from 'src/app/shared-interproject/dialogs/input-dialog/input-dialog.module';
import { ConfirmDialogModule } from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.module';
import { StatisticsComponent } from 'src/app/components/shared-atoms/statistics/statistics.component';
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatTooltipModule } from "@angular/material/tooltip";


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
    ReactiveFormsModule,
    HeroContentCardComponent,
    BrandPrimaryButtonComponent,
    EmptyStateComponent,
    ScreenWrapperComponent,
    LabelValueShowcaseComponent,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    InputDialogModule,
    ConfirmDialogModule,
    StatisticsComponent,
    TimeagoModule
  
  ],
  exports:      [
    UserManagementComponent
  ]
})
export class UserManagementModule {}
