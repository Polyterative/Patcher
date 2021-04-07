import { CommonModule }                from '@angular/common';
import { NgModule }                    from '@angular/core';
import { FlexLayoutModule }            from '@angular/flex-layout';
import { LabelValueShowcaseComponent } from './label-value-showcase.component';

@NgModule({
  declarations: [LabelValueShowcaseComponent],
  exports:      [LabelValueShowcaseComponent],
  imports:      [
    CommonModule,
    FlexLayoutModule
  ]
})
export class LabelValueShowcaseModule {}
