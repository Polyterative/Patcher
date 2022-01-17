import { CommonModule }     from '@angular/common';
import { NgModule }         from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { GraphComponent }   from './graph.component';

@NgModule({
  declarations: [
    GraphComponent
  ],
  imports:      [
    CommonModule,
    FlexLayoutModule
  ],
  exports:      [
    GraphComponent
  ]
})
export class LibGraphModule {}
