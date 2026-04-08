import {
  ChangeDetectionStrategy,
  Component,
  Input
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
import { MatSnackBar } from "@angular/material/snack-bar";


export interface CommentViewConfig {
  showContext: boolean;
  alwaysDeletable: boolean;
}

export const defaultCommentViewConfig: CommentViewConfig = {
  showContext: false,
  alwaysDeletable: false,
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
export class CommentsItemComponent {
  @Input() data: DbComment;
  @Input() viewConfig: CommentViewConfig = defaultCommentViewConfig;

  constructor(
    public dataService: CommentsDataService,
    public userService: UserManagementService,
    private snackBar: MatSnackBar,
  ) {
  }

  avatarColor(username: string): string {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${ hue }, 55%, 42%)`;
  }

  avatarInitials(username: string): string {
    return username.slice(0, 2).toUpperCase();
  }

  requestDelete(): void {
    const ref = this.snackBar.open('Delete this comment?', 'Delete', { duration: 5000 });
    ref.onAction().subscribe(() => {
      this.dataService.deleteComment$.next(this.data.id);
    });
  }
}