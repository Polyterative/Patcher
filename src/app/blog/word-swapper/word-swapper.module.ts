import { CommonModule }         from '@angular/common';
import { NgModule }             from '@angular/core';
import { WordSwapperComponent } from './word-swapper.component';


@NgModule({
    declarations: [WordSwapperComponent],
    imports:      [
        CommonModule
    ],
    exports:      [WordSwapperComponent]
})
export class WordSwapperModule {}
