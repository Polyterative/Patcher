import { CommonModule }            from '@angular/common';
import { NgModule }                from '@angular/core';
import { FlexLayoutModule }        from '@angular/flex-layout';
import { MatCardModule }           from '@angular/material/card';
import { CommentsEditorComponent } from './comments-editor/comments-editor.component';
import { CommentsItemComponent }   from './comments-item/comments-item.component';
import { CommentsListComponent }   from './comments-list/comments-list.component';
import { CommentsRootComponent }   from './comments-root/comments-root.component';


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
    FlexLayoutModule
  ],
  exports:      [
    CommentsListComponent,
    CommentsItemComponent,
    CommentsEditorComponent,
    CommentsRootComponent
  ]
})
export class CommentsModule {}
