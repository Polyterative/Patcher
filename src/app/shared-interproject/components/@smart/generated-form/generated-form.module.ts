import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormEntityComponent } from '../mat-form-entity/mat-form-entity.component';
import { GeneratedFormComponent } from './generated-form.component';


@NgModule({
  declarations: [GeneratedFormComponent],
  imports:      [
    CommonModule,
    MatTooltipModule,
    MatFormEntityComponent
  ],
  exports:      [GeneratedFormComponent]
})
export class GeneratedFormModule {}