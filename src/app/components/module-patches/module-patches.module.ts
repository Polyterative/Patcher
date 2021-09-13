import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { ModulePatchesComponent } from './module-patches/module-patches.component';


@NgModule({
  declarations: [ModulePatchesComponent],
  exports:      [
    ModulePatchesComponent
  ],
  imports:      [
    CommonModule,
    // PatchBrowserModule
  ]
})
export class ModulePatchesModule { }
