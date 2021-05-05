import { CommonModule }          from '@angular/common';
import { NgModule }              from '@angular/core';
import { MatCardModule }         from '@angular/material/card';
import { HeroItemCardComponent } from 'src/app/shared-interproject/components/@visual/hero-item-card/hero-item-card.component';


@NgModule({
  declarations: [
    HeroItemCardComponent
  ],
  imports:      [
    CommonModule,
    MatCardModule
  ],
  exports:      [
    HeroItemCardComponent
  ]
})
export class HeroItemCardModule {}
