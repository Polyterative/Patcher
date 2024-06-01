import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { DbComment } from "src/app/models/comment";
import { MatCardSubtitle } from "@angular/material/card";
import {
  NgForOf,
  NgIf
} from "@angular/common";
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
  standalone: true,
  imports: [
    MatCardSubtitle,
    NgIf,
    NgForOf,
    CommentsItemComponent
  ]
})
export class CommentsItemBlockComponent {
  
  @Input() data: DbComment[];
  // user: SimpleUserModel;
  @Input() viewConfig: CommentViewConfig = defaultCommentViewConfig;
  
  
}