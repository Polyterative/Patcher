import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { RouterModule } from '@angular/router';
import { RouteClickableLinkComponent } from './route-clickable-link.component';


@NgModule({
  declarations: [
    RouteClickableLinkComponent
  ],
  imports:      [
    CommonModule,
    MatIconModule,
    MatMenuModule,
    RouterModule,
    FlexLayoutModule,
    MatListModule,
    MatButtonModule,
    MatTooltipModule
  ],
  exports:      [
    RouteClickableLinkComponent
  ]
})
export class RouteClickableLinkModule {}