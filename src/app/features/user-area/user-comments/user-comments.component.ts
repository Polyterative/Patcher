import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import { CommentsModule } from "src/app/components/shared-atoms/comments/comments.module";
import {
  AsyncPipe,
  NgForOf,
  NgIf,
  NgTemplateOutlet
} from "@angular/common";
import { UserAreaDataService } from "src/app/features/user-area/user-area-data.service";
import { Animations } from "src/app/shared-interproject/SharedConstants";
import { AutoUpdateLoadingIndicatorModule } from "src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator.module";
import { BrandPrimaryButtonModule } from "src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module";
import { FlexModule } from "@angular/flex-layout";
import { HeroContentCardModule } from "src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module";
import { MatCardSubtitle } from "@angular/material/card";
import { MatDivider } from "@angular/material/divider";
import { ModuleBrowserModule } from "src/app/features/module-browser/module-browser.module";
import { RouterLink } from "@angular/router";
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
  standalone: true,
  imports: [
    CommentsModule,
    NgForOf,
    AsyncPipe,
    NgIf,
    AutoUpdateLoadingIndicatorModule,
    BrandPrimaryButtonModule,
    FlexModule,
    HeroContentCardModule,
    MatCardSubtitle,
    MatDivider,
    ModuleBrowserModule,
    NgTemplateOutlet,
    RouterLink,
    CommentsItemBlockComponent
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