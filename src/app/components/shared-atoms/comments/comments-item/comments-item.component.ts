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


@Component({
  selector:        'app-comments-item',
  templateUrl:     './comments-item.component.html',
  styleUrls:       ['./comments-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation:   ViewEncapsulation.None
})
export class CommentsItemComponent implements OnInit {
  @Input() data: DbComment;
  
  constructor(
    public dataService: CommentsDataService,
    public userService: UserManagementService,
    private sanitizer: DomSanitizer
  ) {
  }
  
  ngOnInit(): void {
  }
  
  
  makeURLsClickable(content: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const sanitizedContent = this.sanitizer.sanitize(SecurityContext.HTML, content);
    return sanitizedContent.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
  }
}