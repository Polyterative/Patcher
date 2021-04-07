import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexLayoutModule }       from '@angular/flex-layout';
import { MatTooltipModule }       from '@angular/material/tooltip';
import { MatFormEntityModule }    from '../mat-form-entity/mat-form-entity.module';
import { GeneratedFormComponent } from './generated-form.component';


@NgModule({
  declarations: [GeneratedFormComponent],
  imports:      [
    CommonModule,
    FlexLayoutModule,
    MatTooltipModule,
    MatFormEntityModule
  ],
  exports:      [GeneratedFormComponent]
})
export class GeneratedFormModule {}
