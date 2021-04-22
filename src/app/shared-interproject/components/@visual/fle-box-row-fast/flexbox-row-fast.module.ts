import { CommonModule }            from '@angular/common';
import { NgModule }                from '@angular/core';
import { FlexboxRowFastComponent } from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.component';


@NgModule({
  declarations: [
    FlexboxRowFastComponent
  ],
  imports:      [
    CommonModule
  ],
  exports:      [
    FlexboxRowFastComponent
  ]
})
export class FlexboxRowFastModule {}
