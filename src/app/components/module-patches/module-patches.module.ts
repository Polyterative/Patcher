import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { PatchListModule }        from '../patch-list/patch-list.module';
import { ModulePatchesComponent } from './module-patches.component';


@NgModule({
  declarations: [
    ModulePatchesComponent
  ],
  imports:      [
    CommonModule,
    PatchListModule
  ],
  exports:      [
    ModulePatchesComponent
  ]
})
export class ModulePatchesModule {}
