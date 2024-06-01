import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  SecurityContext,
  ViewEncapsulation
} from '@angular/core';
import { DbComment } from 'src/app/models/comment';
import { CommentsDataService } from "src/app/components/shared-atoms/comments/comments-data.service";
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";
import { DomSanitizer } from "@angular/platform-browser";
import {
  AsyncPipe,
  DatePipe,
  NgIf
} from "@angular/common";
import { TimeagoModule } from "ngx-timeago";
import { MatIcon } from "@angular/material/icon";
import { CleanCardModule } from "src/app/shared-interproject/components/@visual/clean-card/clean-card.module";
import { MatTooltip } from "@angular/material/tooltip";
import { MatIconButton } from "@angular/material/button";
import { CommentContextComponent } from "src/app/components/shared-atoms/comments/comment-context/comment-context.component";


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
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    TimeagoModule,
    AsyncPipe,
    MatIcon,
    CleanCardModule,
    MatTooltip,
    MatIconButton,
    NgIf,
    CommentContextComponent
  ],
  encapsulation: ViewEncapsulation.None
})
export class CommentsItemComponent implements OnInit {
  @Input() data: DbComment;
  currentDateTime = new Date();
  isDeletable = false;
  
  @Input() viewConfig: CommentViewConfig = defaultCommentViewConfig;
  
  constructor(
    public dataService: CommentsDataService,
    public userService: UserManagementService,
    private sanitizer: DomSanitizer
  ) {
  }
  
  ngOnInit(): void {
    // determine if the comment is NOT deletable, only if older than 30 minutes
    const commentDate = new Date(this.data.created);
    const diff = this.currentDateTime.getTime() - commentDate.getTime();
    const maxDiff = 30 * 60 * 1000;
    this.isDeletable = diff < maxDiff;
  }
  
  
  makeURLsClickable(content: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const sanitizedContent = this.sanitizer.sanitize(SecurityContext.HTML, content);
    return sanitizedContent.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
  }
}