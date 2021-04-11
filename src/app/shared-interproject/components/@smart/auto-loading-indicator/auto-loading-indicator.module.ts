import { CommonModule }                  from '@angular/common';
import { NgModule }                      from '@angular/core';
import { MatProgressBarModule }          from '@angular/material/progress-bar';
import { AutoLoadingIndicatorComponent } from './auto-loading-indicator/auto-loading-indicator.component';


@NgModule({
    declarations: [
        AutoLoadingIndicatorComponent
    ],
    imports:      [
        CommonModule,
        MatProgressBarModule
    ],
    exports:      [
        AutoLoadingIndicatorComponent
    ]
})
export class AutoLoadingIndicatorModule {}