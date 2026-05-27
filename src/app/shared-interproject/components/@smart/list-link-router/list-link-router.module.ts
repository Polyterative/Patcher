import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from "@angular/material/list";
import { RouterModule } from '@angular/router';
import { CleanCardComponent } from '../../@visual/clean-card/clean-card.component';
import { ListLinkRouterComponent } from './list-link-router.component';


@NgModule({
    declarations: [ListLinkRouterComponent],
  imports:        [
    FlexLayoutModule,
    MatListModule,
    CommonModule,
    MatIconModule,
    MatCardModule,
    RouterModule,
    CleanCardComponent
  ],
    exports:      [ListLinkRouterComponent]
})
export class ListLinkRouterModule {}