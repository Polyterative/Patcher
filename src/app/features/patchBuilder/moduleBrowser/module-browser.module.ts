import { CommonModule }                 from '@angular/common';
import { NgModule }                     from '@angular/core';
import { ModuleBrowserDataService }     from './module-browser-data.service';
import { ModuleBrowserModuleComponent } from './module-browser-module/module-browser-module.component';
import { ModuleBrowserRootComponent }   from './module-browser-root/module-browser-root.component';


@NgModule({
    declarations: [
        ModuleBrowserRootComponent,
        ModuleBrowserModuleComponent
    ],
    providers:    [ModuleBrowserDataService],
    imports:      [
        CommonModule
    ],
    exports:      [
        ModuleBrowserRootComponent,
        ModuleBrowserModuleComponent
    ]
})
export class ModuleBrowserModule {}
