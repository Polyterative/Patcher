import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';
import { BrandPrimaryButtonComponent } from './brand-primary-button.component';
import { MatButtonModule } from "@angular/material/button";


@NgModule({
  declarations: [BrandPrimaryButtonComponent],
  imports: [
    CommonModule,
    FlexLayoutModule,
    MatButtonModule,
    RouterModule,
    A11yModule,
  ],
  exports: [BrandPrimaryButtonComponent]
})
export class BrandPrimaryButtonModule {}