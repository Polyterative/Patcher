import { CommonModule }                 from '@angular/common';
import { NgModule }                     from '@angular/core';
import { ModuleBrowserModuleComponent } from './module-browser-module/module-browser-module.component';
import { ModuleBrowserRootComponent }   from './module-browser-root/module-browser-root.component';


@NgModule({
  declarations: [
    ModuleBrowserRootComponent,
    ModuleBrowserModuleComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    ModuleBrowserRootComponent,
    ModuleBrowserModuleComponent
  ]
})
export class ModuleBrowserModule { }
