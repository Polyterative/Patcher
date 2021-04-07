import { CommonModule }              from '@angular/common';
import { NgModule }                  from '@angular/core';
import { FlexLayoutModule }          from '@angular/flex-layout';
import { RouterModule }              from '@angular/router';
import { BrandPrimaryButtonModule }  from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { ModuleBrowserModule }       from './moduleBrowser/module-browser.module';
import { PatchBuilderDataService }   from './patch-builder-data.service';
import { PatchBuilderRootComponent } from './patch-builder-root.component';


@NgModule({
    declarations: [
        PatchBuilderRootComponent
    ],
    providers:    [PatchBuilderDataService],
    imports:      [
        CommonModule,
        RouterModule.forRoot([
            {
                path:      'builder',
                component: PatchBuilderRootComponent
                // pathMatch: 'full'
            }
        ]),
        ModuleBrowserModule,
        FlexLayoutModule,
        BrandPrimaryButtonModule
    ],
    exports:      [
        PatchBuilderRootComponent
    ]
})
export class PatchBuilderModule {}
