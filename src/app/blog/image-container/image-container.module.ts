import { CommonModule }            from '@angular/common';
import { NgModule }                from '@angular/core';
import { MatCardModule }           from '@angular/material';
import { ImageContainerComponent } from './image-container.component';


@NgModule({
    declarations: [ImageContainerComponent],
    imports:      [
        CommonModule,
        MatCardModule
    ],
    exports:      [ImageContainerComponent]
})
export class ImageContainerModule {}
