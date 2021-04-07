import { CommonModule }              from '@angular/common';
import { NgModule }                  from '@angular/core';
import { PatchBuilderRootComponent } from './patch-builder-root.component';


@NgModule({
  declarations: [
    PatchBuilderRootComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    PatchBuilderRootComponent
  ]
})
export class PatchBuilderModule { }
