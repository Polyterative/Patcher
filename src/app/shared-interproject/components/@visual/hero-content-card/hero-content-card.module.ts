import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatCardModule }            from '@angular/material/card';
import { MatIconModule }            from '@angular/material/icon';
import { HeroContentCardComponent } from './hero-content-card.component';

@NgModule({
    declarations: [HeroContentCardComponent],
    imports: [
        CommonModule,
        MatCardModule,
        FlexLayoutModule,
        MatIconModule,
        MatCardModule
    ],
    exports:      [HeroContentCardComponent]
})
export class HeroContentCardModule {}
