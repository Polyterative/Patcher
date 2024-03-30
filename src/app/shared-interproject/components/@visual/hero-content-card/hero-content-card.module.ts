import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { HeroContenstCardHeadIconComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-contenst-card-head-icon/hero-contenst-card-head-icon.component';
import { HeroContentCardComponent } from './hero-content-card.component';


@NgModule({
  declarations: [
    HeroContentCardComponent,
    HeroContenstCardHeadIconComponent
  ],
  imports:      [
    CommonModule,
    MatCardModule,
    FlexLayoutModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule
  ],
  exports:      [HeroContentCardComponent]
})
export class HeroContentCardModule {}