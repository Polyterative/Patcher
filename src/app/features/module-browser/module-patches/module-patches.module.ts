import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { ModulePatchesComponent } from './module-patches.component';


@NgModule({
  declarations: [ModulePatchesComponent],
  exports:      [
    ModulePatchesComponent
  ],
  imports:      [
    CommonModule
  ]
})
export class ModulePatchesModule {}
