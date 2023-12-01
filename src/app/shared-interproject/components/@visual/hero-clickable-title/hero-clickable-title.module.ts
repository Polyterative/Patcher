import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { HeroClickableTitleComponent } from 'src/app/shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.component';

@NgModule({
  declarations: [
    HeroClickableTitleComponent
  ],
  imports:      [
    CommonModule,
    MatCardModule,
    RouterModule,
    FlexLayoutModule
  ],
  exports:      [
    HeroClickableTitleComponent
  ]
})
export class HeroClickableTitleModule {}
