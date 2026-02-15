import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { RouterModule } from '@angular/router';
import { UserLoginDataService } from 'src/app/features/backbone/login/login-page/user-login-data.service';
import { EmptyStateModule } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.module';
import { LottieContainerModule } from 'src/app/shared-interproject/components/@smart/lottie-container/lottie-container.module';
import { MatFormEntityModule } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { LoginEmailModule } from './login-email/login-email.module';
import { LoginPageComponent } from './login-page.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    LoginPageComponent,
  ],
  providers:    [UserLoginDataService],
  imports:      [
    CommonModule,
    MatFormEntityModule,
    BrandPrimaryButtonModule,
    EmptyStateModule,
    ScreenWrapperModule,
    HeroContentCardModule,
    FlexLayoutModule,
    LoginEmailModule,
    RouterModule,
    MatCardModule,
    LottieContainerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    FormsModule
  ],
  exports:      [
    LoginPageComponent,
  ]
})
export class LoginPageModule {}