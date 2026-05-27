import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatButtonModule,
    MatTooltipModule
  ],
  exports:      [
    RouteClickableLinkComponent
  ]
})
export class RouteClickableLinkModule {}