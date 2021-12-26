import { CommonModule }          from '@angular/common';
import { NgModule }              from '@angular/core';
import { FlexLayoutModule }      from '@angular/flex-layout';
import { MatCardModule }         from '@angular/material/card';
import { HeroItemCardComponent } from 'src/app/shared-interproject/components/@visual/hero-item-card/hero-item-card.component';
import { CleanCardModule }       from '../clean-card/clean-card.module';


@NgModule({
  declarations: [
    HeroItemCardComponent
  ],
  imports:      [
    CommonModule,
    MatCardModule,
    FlexLayoutModule,
    CleanCardModule
  ],
  exports:      [
    HeroItemCardComponent
  ]
})
export class HeroItemCardModule {}
