import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from "@angular/material/list";
import { RouterModule } from '@angular/router';
import { RouteClickableLinkComponent } from './route-clickable-link.component';
import { MatMenuModule } from "@angular/material/menu";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";


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