import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatCardModule } from "@angular/material/card";
import { DevOnlyWindowModule } from 'src/app/shared-interproject/components/@smart/dev-only-window/dev-only-window.module';
import { MatFormEntityModule } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { CommentsDataService } from './comments-data.service';
import { CommentsEditorComponent } from './comments-editor/comments-editor.component';
import { CommentsItemComponent } from './comments-item/comments-item.component';
import { CommentsListComponent } from './comments-list/comments-list.component';
import { CommentsRootComponent } from './comments-root/comments-root.component';
import {
  MatList,
  MatListItem
} from "@angular/material/list";
import {
  MatTree,
  MatTreeNode
} from "@angular/material/tree";
import { AutoUpdateLoadingIndicatorModule } from "src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator.module";
import { MatIcon } from "@angular/material/icon";
import { MatIconButton } from "@angular/material/button";
import { NgDatePipesModule } from "ngx-pipes";
import { TimeagoModule } from "ngx-timeago";
import { MatTooltip } from "@angular/material/tooltip";
import { CleanCardModule } from "src/app/shared-interproject/components/@visual/clean-card/clean-card.module";


@NgModule({
  declarations: [
    CommentsListComponent,
    CommentsItemComponent,
    CommentsEditorComponent,
    CommentsRootComponent
  ],
  imports: [
    CommonModule,
    MatCardModule,
    BrandPrimaryButtonModule,
    MatFormEntityModule,
    DevOnlyWindowModule,
    HeroContentCardModule,
    MatListItem,
    MatList,
    MatTreeNode,
    MatTree,
    AutoUpdateLoadingIndicatorModule,
    MatIcon,
    MatIconButton,
    NgDatePipesModule,
    TimeagoModule,
    MatTooltip,
    CleanCardModule,
  ],
  providers:    [CommentsDataService],
  exports:      [
    CommentsListComponent,
    CommentsItemComponent,
    CommentsEditorComponent,
    CommentsRootComponent
  ]
})
export class CommentsModule {}