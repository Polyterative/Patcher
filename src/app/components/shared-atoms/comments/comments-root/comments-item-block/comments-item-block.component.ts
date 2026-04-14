import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { DbComment } from "src/app/models/comment";
import { MatIcon } from "@angular/material/icon";

import {
  CommentsItemComponent,
  CommentViewConfig,
  defaultCommentViewConfig
} from "src/app/components/shared-atoms/comments/comments-item/comments-item.component";


@Component({
  selector: 'app-comments-item-block',
  templateUrl: './comments-item-block.component.html',
  styleUrl: './comments-item-block.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIcon,
    CommentsItemComponent
  ]
})
export class CommentsItemBlockComponent {

  @Input() data: DbComment[];
  @Input() viewConfig: CommentViewConfig = defaultCommentViewConfig;

}