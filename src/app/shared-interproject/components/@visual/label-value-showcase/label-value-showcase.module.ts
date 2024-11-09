import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { LabelValueShowcaseComponent } from './label-value-showcase.component';
import { MatIcon } from "@angular/material/icon";


@NgModule({
  declarations: [LabelValueShowcaseComponent],
  exports:      [LabelValueShowcaseComponent],
  imports: [
    CommonModule,
    FlexLayoutModule,
    MatIcon
  ]
})
export class LabelValueShowcaseModule {}
