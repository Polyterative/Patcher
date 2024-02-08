import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatisticsComponent } from 'src/app/components/shared-atoms/statistics/statistics.component';
import { LabelValueShowcaseModule } from "src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module";


@NgModule({
  declarations: [
    StatisticsComponent
  ],
  imports: [
    CommonModule,
    LabelValueShowcaseModule
  ],
  exports: [
    StatisticsComponent
  ]
})
export class StatisticsModule {}