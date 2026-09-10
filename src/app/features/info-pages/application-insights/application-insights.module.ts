import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterModule } from '@angular/router';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { ApplicationInsightsPageComponent } from './application-insights-page.component';
import { InsightChipComponent } from './insight-chip/insight-chip.component';
import { InsightMetricBarComponent } from './insight-metric-bar/insight-metric-bar.component';

@NgModule({
  declarations: [
    ApplicationInsightsPageComponent,
    InsightChipComponent,
    InsightMetricBarComponent
  ],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    BrandPrimaryButtonComponent,
    CleanCardComponent,
    HeroContentCardComponent,
    ModulePartsModule,
    ScreenWrapperComponent,
    RouterModule.forChild([
      {
        path: '',
        component: ApplicationInsightsPageComponent
      }
    ])
  ]
})
export class ApplicationInsightsModule {}
