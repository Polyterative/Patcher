import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { RouterModule } from '@angular/router';
import { CleanCardModule } from '../../@visual/clean-card/clean-card.module';
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
    CleanCardModule
  ],
    exports:      [ListLinkRouterComponent]
})
export class ListLinkRouterModule {}