import { DragDropModule }               from '@angular/cdk/drag-drop';
import { CommonModule }                 from '@angular/common';
import { NgModule }                     from '@angular/core';
import { FlexLayoutModule }             from '@angular/flex-layout';
import { MatCardModule }                from '@angular/material/card';
import { MatChipsModule }               from '@angular/material/chips';
import { HeroContentCardModule }        from '../../../shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
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
        CommonModule,
        FlexLayoutModule,
        MatCardModule,
        HeroContentCardModule,
        MatChipsModule,
        DragDropModule
    ],
    exports:      [
        ModuleBrowserRootComponent,
        ModuleBrowserModuleComponent
    ]
})
export class ModuleBrowserModule {}
