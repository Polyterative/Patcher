import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatCardModule } from "@angular/material/card";
import { DevOnlyWindowComponent } from 'src/app/shared-interproject/components/@smart/dev-only-window/dev-only-window/dev-only-window.component';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { CommentsDataService } from './comments-data.service';
import { CommentsRootComponent } from './comments-root/comments-root.component';
import {
  MatList,
  MatListItem
} from "@angular/material/list";
import {
  MatTree,
  MatTreeNode
} from "@angular/material/tree";
import { AutoUpdateLoadingIndicatorComponent } from "src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component";
import { MatIcon } from "@angular/material/icon";
import {
  MatButton,
  MatIconButton
} from "@angular/material/button";
import { NgDatePipesModule } from "ngx-pipes";
import { TimeagoModule } from "ngx-timeago";
import { MatTooltip } from "@angular/material/tooltip";
import { CleanCardComponent } from "src/app/shared-interproject/components/@visual/clean-card/clean-card.component";
import { CommentsItemBlockComponent } from "src/app/components/shared-atoms/comments/comments-root/comments-item-block/comments-item-block.component";


@NgModule({
  declarations: [
    CommentsRootComponent
  ],
  imports: [
    CommonModule,
    MatCardModule,
    BrandPrimaryButtonComponent,
    MatFormEntityComponent,
    DevOnlyWindowComponent,
    HeroContentCardComponent,
    MatListItem,
    MatList,
    MatTreeNode,
    MatTree,
    AutoUpdateLoadingIndicatorComponent,
    MatIcon,
    MatButton,
    MatIconButton,
    NgDatePipesModule,
    TimeagoModule,
    MatTooltip,
    CleanCardComponent,
    CommentsItemBlockComponent,
  ],
  providers:    [CommentsDataService],
  exports:      [
    CommentsRootComponent
  ]
})
export class CommentsModule {}