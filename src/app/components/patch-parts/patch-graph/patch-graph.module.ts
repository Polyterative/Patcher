import { NgModule }            from '@angular/core';
import { CommonModule }        from '@angular/common';
import { FlexLayoutModule }    from '@angular/flex-layout';
import { NgxGraphModule }      from '@swimlane/ngx-graph';
import { PatchGraphComponent } from './patch-graph/patch-graph.component';



@NgModule({
  declarations: [
    PatchGraphComponent
  ],
  imports: [
    CommonModule,
    NgxGraphModule,
    FlexLayoutModule
  ],
  exports: [
    PatchGraphComponent
  ]
})
export class PatchGraphModule { }
