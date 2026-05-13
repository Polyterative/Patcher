import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatisticsComponent } from 'src/app/components/shared-atoms/statistics/statistics.component';
import { LabelValueShowcaseModule } from "src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module";
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { EmptyStateTipsComponent } from 'src/app/components/shared-atoms/empty-state-tips/empty-state-tips.component';


@NgModule({
  declarations: [
    StatisticsComponent
  ],
  imports: [
    CommonModule,
    LabelValueShowcaseModule,
    HeroContentCardModule,
    EmptyStateTipsComponent
  ],
  exports: [
    StatisticsComponent
  ]
})
export class StatisticsModule {}