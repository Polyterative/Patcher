import { CommonModule }     from '@angular/common';
import { NgModule }         from '@angular/core';
import { FlatBoxComponent } from './flat-box.component';


@NgModule({
    declarations: [FlatBoxComponent],
    imports:      [
        CommonModule
    ],
    exports:      [FlatBoxComponent]
})
export class FlatBoxModule {}
