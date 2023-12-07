import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PageHeaderComponent } from './page-header/page-header.component';

@NgModule({
    declarations: [
        PageHeaderComponent
    ],
    imports:      [
        CommonModule,
        MatToolbarModule
    ],
    exports:      [
        PageHeaderComponent
    ]
})
export class PageHeaderModule {}
