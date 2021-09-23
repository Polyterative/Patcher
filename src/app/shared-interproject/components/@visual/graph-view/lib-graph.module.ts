import { NgModule }            from '@angular/core';
import { CommonModule }        from '@angular/common';
import { FlexLayoutModule }    from '@angular/flex-layout';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { GraphComponent } from './graph.component';



@NgModule({
  declarations: [
    GraphComponent
  ],
  imports: [
    CommonModule,
    NgxGraphModule,
    FlexLayoutModule
  ],
  exports: [
    GraphComponent
  ]
})
export class LibGraphModule { }
