import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CountdownProgressComponent } from './countdown-progress.component';


@NgModule({
  declarations: [CountdownProgressComponent],
  imports: [
    CommonModule
  ],
  exports: [CountdownProgressComponent]
})
export class CountdownProgressModule {}