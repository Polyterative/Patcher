import { CommonModule }              from '@angular/common';
import { NgModule }                  from '@angular/core';
import { RouterModule }              from '@angular/router';
import { PatchBuilderRootComponent } from './patch-builder-root.component';


@NgModule({
    declarations: [
        PatchBuilderRootComponent
    ],
    imports:      [
        CommonModule,
        RouterModule.forRoot([
            {
                path:      'builder',
                component: PatchBuilderRootComponent
                // pathMatch: 'full'
            }
        ])
    ],
    exports:      [
        PatchBuilderRootComponent
    ]
})
export class PatchBuilderModule {}
