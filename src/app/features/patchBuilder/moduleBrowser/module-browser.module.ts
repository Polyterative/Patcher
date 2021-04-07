import { CommonModule }               from '@angular/common';
import { NgModule }                   from '@angular/core';
import { ModuleBrowserRootComponent } from './module-browser-root/module-browser-root.component';


@NgModule({
  declarations: [
    ModuleBrowserRootComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    ModuleBrowserRootComponent
  ]
})
export class ModuleBrowserModule { }
