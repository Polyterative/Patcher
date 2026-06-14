import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { ChangelogComponent } from './changelog/changelog.component';

export const infoPageRoutes = [
  {
    path: 'changelog',
    component: ChangelogComponent
  },
  {
    path: 'insights',
    loadChildren: () => import('./application-insights/application-insights.module')
      .then(m => m.ApplicationInsightsModule)
  }
];


@NgModule({
  declarations: [
    ChangelogComponent
  ],
  imports:      [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    BrandPrimaryButtonComponent,
    CleanCardComponent,
    HeroContentCardComponent,
    ScreenWrapperComponent,
    
    RouterModule.forChild(infoPageRoutes),
    // MarkdownModule
  ],
  exports:      [
    ChangelogComponent
  ]
})
export class InfoPagesModule {}
