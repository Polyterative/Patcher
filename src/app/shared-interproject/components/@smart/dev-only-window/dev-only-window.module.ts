import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DevOnlyWindowComponent } from './dev-only-window/dev-only-window.component';

@NgModule({
    declarations: [
        DevOnlyWindowComponent
    ],
    imports:      [
        CommonModule
    ],
    exports:      [
        DevOnlyWindowComponent
    ]
})
export class DevOnlyWindowModule {}
