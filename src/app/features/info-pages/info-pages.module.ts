import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterModule } from '@angular/router';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { CleanCardModule } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.module';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { ApplicationInsightsPageComponent } from './application-insights/application-insights-page.component';
import { ChangelogComponent } from './changelog/changelog.component';


@NgModule({
  declarations: [
    ChangelogComponent,
    ApplicationInsightsPageComponent
  ],
  imports:      [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    BrandPrimaryButtonModule,
    CleanCardModule,
    HeroContentCardModule,
    ScreenWrapperModule,
    
    RouterModule.forChild([
      {
        path:      'info/changelog',
        component: ChangelogComponent
      },
      {
        path: 'insights',
        component: ApplicationInsightsPageComponent
      }
    ]),
    // MarkdownModule
  ],
  exports:      [
    ChangelogComponent,
    ApplicationInsightsPageComponent
  ]
})
export class InfoPagesModule {}
