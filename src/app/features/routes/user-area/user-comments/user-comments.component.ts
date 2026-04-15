import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import {
  AsyncPipe,
  NgTemplateOutlet
} from "@angular/common";
import { MatPaginatorModule } from "@angular/material/paginator";
import { UserAreaDataService } from "src/app/features/routes/user-area/user-area-data.service";
import { Animations } from "src/app/shared-interproject/SharedConstants";
import { HeroContentCardModule } from "src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module";
import { CommentsItemBlockComponent } from "src/app/components/shared-atoms/comments/comments-root/comments-item-block/comments-item-block.component";
import {
  CommentViewConfig,
  defaultCommentViewConfig
} from "src/app/components/shared-atoms/comments/comments-item/comments-item.component";
import { BehaviorSubject, combineLatest, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { MatChipsModule } from "@angular/material/chips";
import { CommentableEntityTypes } from "src/app/components/shared-atoms/comments/comments-data.service";
import { DbComment } from "src/app/models/comment";
import { MatCardSubtitle } from "@angular/material/card";


interface FilterOption {
  label: string;
  value: number | null;
}

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
    MatPaginatorModule,
    MatChipsModule,
    MatCardSubtitle,
  ]
})
export class UserCommentsComponent implements OnInit {
  commentViewConfig: CommentViewConfig = {
    ...defaultCommentViewConfig,
    showContext: true,
    alwaysDeletable: true,
  };

  readonly filterOptions: FilterOption[] = [
    { label: 'All',     value: null },
    { label: 'Modules', value: CommentableEntityTypes.MODULE },
    { label: 'Racks',   value: CommentableEntityTypes.RACK },
    { label: 'Patches', value: CommentableEntityTypes.PATCH },
  ];

  readonly activeFilter$ = new BehaviorSubject<number | null>(null);
  readonly filteredComments$: Observable<DbComment[] | undefined>;

  constructor(
    public dataService: UserAreaDataService,
  ) {
    this.filteredComments$ = combineLatest([
      this.dataService.filteredCommentsData$,
      this.activeFilter$,
    ]).pipe(
      map(([data, filter]: [DbComment[] | undefined, number | null]) =>
        filter == null ? data : data?.filter(c => c.entityType === filter)
      )
    );
  }

  ngOnInit(): void {
    this.dataService.updateCommentsData$.next();
  }

  setFilter(value: number | null): void {
    this.activeFilter$.next(value);
  }
}
