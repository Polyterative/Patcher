import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { LoginEmailComponent } from './login-email.component';


@NgModule({
  declarations: [
    LoginEmailComponent
  ],
  imports:      [
    CommonModule,
    MatFormEntityComponent,
    BrandPrimaryButtonModule,
    FlexLayoutModule
  ],
  exports:      [
    LoginEmailComponent
  ]
})
export class LoginEmailModule {}