import { CommonModule }              from '@angular/common';
import { NgModule }                  from '@angular/core';
import { FlexLayoutModule }          from '@angular/flex-layout';
import { RouterModule }              from '@angular/router';
import { ModuleBrowserModule }       from './moduleBrowser/module-browser.module';
import { PatchBuilderRootComponent } from './patch-builder-root.component';


@NgModule({
    declarations: [
        PatchBuilderRootComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forRoot([
            {
                path:      'builder',
                component: PatchBuilderRootComponent
                // pathMatch: 'full'
            }
        ]),
        ModuleBrowserModule,
        FlexLayoutModule
    ],
    exports:      [
        PatchBuilderRootComponent
    ]
})
export class PatchBuilderModule {}
