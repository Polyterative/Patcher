import { CommonModule }              from '@angular/common';
import { NgModule }                  from '@angular/core';
import { FlexLayoutModule }          from '@angular/flex-layout';
import { MatIconModule }             from '@angular/material/icon';
import { RouterModule }              from '@angular/router';
import { BrandPrimaryButtonModule }  from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { ScreenWrapperModule }       from '../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { ModuleBrowserModule }       from './moduleBrowser/module-browser.module';
import { PatchBuilderDataService }   from './patch-builder-data.service';
import { PatchBuilderRootComponent } from './patch-builder-root.component';
import { MatExpansionModule }        from '@angular/material/expansion';

@NgModule({
    declarations: [
        PatchBuilderRootComponent
    ],
    providers:    [PatchBuilderDataService],
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
        FlexLayoutModule,
        BrandPrimaryButtonModule,
        ScreenWrapperModule,
        MatExpansionModule,
        MatIconModule
    ],
    exports:      [
        PatchBuilderRootComponent
    ]
})
export class PatchBuilderModule {}