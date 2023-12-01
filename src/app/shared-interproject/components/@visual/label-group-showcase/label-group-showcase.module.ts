import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { LabelGroupShowcaseComponent } from './label-group-showcase.component';

@NgModule({
  declarations: [LabelGroupShowcaseComponent],
  exports:      [LabelGroupShowcaseComponent],
  imports:      [
    CommonModule,
    FlexLayoutModule
  ]
})
export class LabelGroupShowcaseModule {}
