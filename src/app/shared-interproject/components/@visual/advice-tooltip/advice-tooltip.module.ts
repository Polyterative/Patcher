import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { MatToolbarModule }       from '@angular/material/toolbar';
import { AdviceTooltipComponent } from './advice-tooltip/advice-tooltip.component';


@NgModule({
  declarations: [
    AdviceTooltipComponent
  ],
  imports:      [
    CommonModule,
    MatToolbarModule
  ],
  exports:      [
    AdviceTooltipComponent
  ]
})
export class AdviceTooltipModule {}
