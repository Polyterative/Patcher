import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
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


@NgModule({
  declarations: [
    CommentsListComponent,
    CommentsItemComponent,
    CommentsEditorComponent,
    CommentsRootComponent
  ],
  imports:      [
    CommonModule,
    MatCardModule,
    FlexLayoutModule,
    BrandPrimaryButtonModule,
    MatFormEntityModule,
    DevOnlyWindowModule,
    HeroContentCardModule
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