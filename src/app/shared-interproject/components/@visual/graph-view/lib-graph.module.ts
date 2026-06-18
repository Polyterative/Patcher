import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { GraphComponent } from './graph.component';

@NgModule({
  declarations: [
    GraphComponent
  ],
  imports:      [
    CommonModule
  ],
  exports:      [
    GraphComponent
  ]
})
export class LibGraphModule {}
