import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import {
  AsyncPipe,
  NgTemplateOutlet
} from "@angular/common";
import { UserAreaDataService } from "src/app/features/routes/user-area/user-area-data.service";
import { Animations } from "src/app/shared-interproject/SharedConstants";
import { HeroContentCardModule } from "src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module";
import { CommentsItemBlockComponent } from "src/app/components/shared-atoms/comments/comments-root/comments-item-block/comments-item-block.component";
import {
  CommentViewConfig,
  defaultCommentViewConfig
} from "src/app/components/shared-atoms/comments/comments-item/comments-item.component";


@Component({
  selector: 'app-user-comments',
  templateUrl: './user-comments.component.html',
  styleUrl: './user-comments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    Animations.fadeInOnEnter
  ],
  imports: [
    AsyncPipe,
    NgTemplateOutlet,
    HeroContentCardModule,
    CommentsItemBlockComponent,
  ]
})
export class UserCommentsComponent implements OnInit {
  commentViewConfig: CommentViewConfig = {
    ...defaultCommentViewConfig,
    showContext: true
  };
  
  constructor(
    public dataService: UserAreaDataService,
  ) {
  }
  
  ngOnInit(): void {
    this.dataService.updateCommentsData$.next();
  }
}