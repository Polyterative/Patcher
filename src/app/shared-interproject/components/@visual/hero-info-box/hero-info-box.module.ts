import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { HeroInfoBoxTextDirective } from './hero-info-box-text.directive';
import { HeroInfoBoxComponent } from './hero-info-box.component';


@NgModule({
  declarations: [HeroInfoBoxComponent, HeroInfoBoxTextDirective],
  exports:      [
    HeroInfoBoxComponent,
    HeroInfoBoxTextDirective
  ],
  imports:      [
    CommonModule,
    FlexLayoutModule,
    MatCardModule
  ]
})
export class HeroInfoBoxModule { }