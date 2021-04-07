import { CommonModule }                from '@angular/common';
import { NgModule }                    from '@angular/core';
import { FlexLayoutModule }            from '@angular/flex-layout';
import { MatIconModule }               from '@angular/material/icon';
import { MatSlideToggleModule }        from '@angular/material/slide-toggle';
import { MatTooltipModule }            from '@angular/material/tooltip';
import { HeroInfoBoxModule }           from '../hero-info-box/hero-info-box.module';
import { IconTogglerBooleanComponent } from './icon-toggler-boolean.component';


@NgModule({
  declarations: [IconTogglerBooleanComponent],
  exports:      [
    IconTogglerBooleanComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    MatSlideToggleModule,
    FlexLayoutModule,
    MatTooltipModule,
    HeroInfoBoxModule
  ]
})
export class IconTogglerBooleanModule {}
