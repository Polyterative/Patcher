import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AdviceTooltipComponent } from './advice-tooltip/advice-tooltip.component';

@NgModule({
  declarations: [
    AdviceTooltipComponent
  ],
  imports:      [
    CommonModule,
    MatIconModule
  ],
  exports:      [
    AdviceTooltipComponent
  ]
})
export class AdviceTooltipModule {}
