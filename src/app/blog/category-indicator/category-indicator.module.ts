import { CommonModule }               from '@angular/common';
import { NgModule }                   from '@angular/core';
import { CategoryIndicatorComponent } from './category-indicator.component';


@NgModule({
  declarations: [CategoryIndicatorComponent],
  imports:      [
    CommonModule
  ],
  exports:      [CategoryIndicatorComponent]
})
export class CategoryIndicatorModule {}
