import { DragDropModule }               from '@angular/cdk/drag-drop';
import { ScrollingModule }              from '@angular/cdk/scrolling';
import { CommonModule }                 from '@angular/common';
import { NgModule }                     from '@angular/core';
import { FlexLayoutModule }             from '@angular/flex-layout';
import { MatCardModule }                from '@angular/material/card';
import { MatChipsModule }               from '@angular/material/chips';
import { RouterModule }                 from '@angular/router';
import { HeroContentCardModule }        from '../../../shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { LabelValueShowcaseModule }     from '../../../shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { ScreenWrapperModule }          from '../../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { PatchBuilderRootComponent }    from '../patch-builder-root.component';
import { ModuleBrowserDataService }     from './module-browser-data.service';
import { ModuleBrowserModuleComponent } from './module-browser-module/module-browser-module.component';
import { ModuleBrowserRootComponent }   from './module-browser-root/module-browser-root.component';


@NgModule({
    declarations: [
        ModuleBrowserRootComponent,
        ModuleBrowserModuleComponent
    ],
    providers:    [ModuleBrowserDataService],
    imports: [
        CommonModule,
        RouterModule.forRoot([
            {
                path:      'browser',
                component: ModuleBrowserRootComponent
                // pathMatch: 'full'
            }
        ]),
        FlexLayoutModule,
        MatCardModule,
        HeroContentCardModule,
        MatChipsModule,
        DragDropModule,
        LabelValueShowcaseModule,
        ScrollingModule,
        ScreenWrapperModule
    ],
    exports:      [
        ModuleBrowserRootComponent,
        ModuleBrowserModuleComponent
    ]
})
export class ModuleBrowserModule {}