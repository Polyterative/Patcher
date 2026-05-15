import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { EmptyStateModule } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.module';
import { LegacyLinkGonePageComponent } from './legacy-link-gone-page.component';

@NgModule({
  declarations: [
    LegacyLinkGonePageComponent
  ],
  imports:      [
    CommonModule,
    RouterModule.forRoot([
      {
        path:      'links/retired',
        component: LegacyLinkGonePageComponent
      }
    ], {scrollPositionRestoration: 'enabled'}),
    EmptyStateModule,
    FlexLayoutModule,
    MatButtonModule,
    MatCardModule
  ],
  exports:      [
    LegacyLinkGonePageComponent
  ]
})
export class LegacyLinkGoneModule {}
