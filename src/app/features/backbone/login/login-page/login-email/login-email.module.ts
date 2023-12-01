import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatFormEntityModule } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { LoginEmailComponent } from './login-email.component';

@NgModule({
  declarations: [
    LoginEmailComponent
  ],
  imports:      [
    CommonModule,
    MatFormEntityModule,
    BrandPrimaryButtonModule,
    FlexLayoutModule
  ],
  exports:      [
    LoginEmailComponent
  ]
})
export class LoginEmailModule {}
