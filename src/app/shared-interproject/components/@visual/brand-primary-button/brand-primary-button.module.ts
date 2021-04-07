import { CommonModule }                from '@angular/common';
import { NgModule }                    from '@angular/core';
import { FlexLayoutModule }            from '@angular/flex-layout';
import { MatButtonModule }             from '@angular/material/button';
import { MatIconModule }               from '@angular/material/icon';
import { BrandPrimaryButtonComponent } from './brand-primary-button.component';

@NgModule({
    declarations: [BrandPrimaryButtonComponent],
    imports: [
        CommonModule,
        MatButtonModule,
        FlexLayoutModule,
        MatButtonModule,
        MatIconModule
    ],
    exports:      [BrandPrimaryButtonComponent]
})
export class BrandPrimaryButtonModule {}