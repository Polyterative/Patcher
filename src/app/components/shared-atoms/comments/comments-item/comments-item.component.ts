import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { DbComment } from 'src/app/models/comment';
import { CommentsDataService } from "src/app/components/shared-atoms/comments/comments-data.service";
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";
import {
  AsyncPipe,
  DatePipe
} from "@angular/common";
import { TimeagoModule } from "ngx-timeago";
import { MatIcon } from "@angular/material/icon";
import { CleanCardModule } from "src/app/shared-interproject/components/@visual/clean-card/clean-card.module";
import { MatTooltip } from "@angular/material/tooltip";
import { MatIconButton } from "@angular/material/button";
import { CommentContextComponent } from "src/app/components/shared-atoms/comments/comment-context/comment-context.component";
import { CommentTextPipe } from "src/app/components/shared-atoms/comments/comment-text.pipe";


export interface CommentViewConfig {
  showContext: boolean;
}

export const defaultCommentViewConfig: CommentViewConfig = {
  showContext: false
};

@Component({
  selector: 'app-comments-item',
  templateUrl: './comments-item.component.html',
  styleUrls: ['./comments-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    TimeagoModule,
    AsyncPipe,
    MatIcon,
    CleanCardModule,
    MatTooltip,
    MatIconButton,
    CommentContextComponent,
    CommentTextPipe,
  ],
})
export class CommentsItemComponent implements OnInit {
  @Input() data: DbComment;
  currentDateTime = new Date();
  isDeletable = false;

  @Input() viewConfig: CommentViewConfig = defaultCommentViewConfig;
  
  constructor(
    public dataService: CommentsDataService,
    public userService: UserManagementService,
  ) {
  }
  
  ngOnInit(): void {
    const commentDate = new Date(this.data.created);
    const diff = this.currentDateTime.getTime() - commentDate.getTime();
    this.isDeletable = diff < 30 * 60 * 1000;
  }
}