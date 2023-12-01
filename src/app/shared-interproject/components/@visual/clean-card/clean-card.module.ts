import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CleanCardComponent } from './clean-card.component';

@NgModule({
  declarations: [CleanCardComponent],
  imports:      [
    CommonModule
  ],
  exports:      [CleanCardComponent]
})
export class CleanCardModule {}
