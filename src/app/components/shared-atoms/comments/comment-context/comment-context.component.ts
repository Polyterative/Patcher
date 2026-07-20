import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import {
  CommentableEntityTypes,
  DbComment
} from "src/app/models/comment";
import { AsyncPipe } from "@angular/common";
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";
import { BehaviorSubject } from "rxjs";
import { Router } from "@angular/router";
import { MatIcon } from "@angular/material/icon";
import {
  CommentContext,
  CommentContextDataService
} from "src/app/components/shared-atoms/comments/comment-context/comment-context-data.service";

@Component({
  selector: 'app-comment-context',
  imports: [
    AsyncPipe,
    MatIcon,
  ],
  templateUrl: './comment-context.component.html',
  styleUrl: './comment-context.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CommentContextDataService]
})
export class CommentContextComponent extends SubManager implements OnInit {
  @Input() data: DbComment;

  private readonly _contextInformation$ = new BehaviorSubject<CommentContext | undefined>(undefined);
  readonly contextInformation$ = this._contextInformation$.asObservable();

  constructor(
    private dataService: CommentContextDataService,
    private router: Router,
  ) {
    super();
  }

  ngOnInit(): void {
    this.dataService.contextForComment(this.data)
      .pipe(this.takeUntilDestroyed())
      .subscribe(context => this._contextInformation$.next(context));
  }

  openURL() {
    this.router.navigate(this._contextInformation$.value.URL);
  }
}