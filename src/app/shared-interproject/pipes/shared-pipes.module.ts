import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { EllipsisPipe } from './ellipsis.pipe';

@NgModule({
  declarations: [
    EllipsisPipe
  ],
  exports:      [
    EllipsisPipe
  ],
  imports:      [
    CommonModule
  ]
})
export class SharedPipesModule { }
