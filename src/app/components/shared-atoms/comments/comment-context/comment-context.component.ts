import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { DbComment } from "src/app/models/comment";
import { CommentableEntityTypes } from "src/app/components/shared-atoms/comments/comments-data.service";
import { AsyncPipe } from "@angular/common";
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";
import { SupabaseService } from "src/app/features/backend/supabase.service";
import {
  map,
  takeUntil
} from "rxjs/operators";
import { BehaviorSubject } from "rxjs";
import { QueryJoins } from "src/app/features/backend/DatabaseStrings";
import { Router } from "@angular/router";
import { MatButton } from "@angular/material/button";
import { MatIcon } from "@angular/material/icon";


interface CommentContext {
  description: string;
  URL: string[];
  entityLabel: string;
}

const ENTITY_LABELS: Record<number, string> = {
  [CommentableEntityTypes.MODULE]: 'Module',
  [CommentableEntityTypes.RACK]:   'Rack',
  [CommentableEntityTypes.PATCH]:  'Patch',
  [CommentableEntityTypes.PROFILE]: 'Profile',
};

@Component({
  selector: 'app-comment-context',
  imports: [
    AsyncPipe,
    MatIcon,
  ],
  templateUrl: './comment-context.component.html',
  styleUrl: './comment-context.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentContextComponent extends SubManager implements OnInit {
  @Input() data: DbComment;

  entityTypes = CommentableEntityTypes;

  private readonly _contextInformation$ = new BehaviorSubject<CommentContext | undefined>(undefined);
  readonly contextInformation$ = this._contextInformation$.asObservable();

  constructor(
    private backend: SupabaseService,
    private router: Router,
  ) {
    super();
  }

  ngOnInit(): void {
    const entityLabel = ENTITY_LABELS[this.data.entityType] ?? 'Item';

    switch (this.data.entityType) {
      case this.entityTypes.MODULE:
        this.backend.GET.moduleWithId(
          this.data.entityId,
          `name,id,${ QueryJoins.manufacturer }`)
          .pipe(map(x => x.data), takeUntil(this.destroy$))
          .subscribe(module => {
            this._contextInformation$.next({
              description: `${ module.name } by ${ module.manufacturer.name }`,
              URL: ['modules', 'details', module.id],
              entityLabel,
            });
          });
        break;
      case this.entityTypes.PATCH:
        this.backend.get.patchWithId(this.data.entityId, 'name,id')
          .pipe(map(x => x.data), takeUntil(this.destroy$))
          .subscribe(patch => {
            this._contextInformation$.next({
              description: patch.name,
              URL: ['patches', 'details', patch.id],
              entityLabel,
            });
          });
        break;
      case this.entityTypes.RACK:
        this.backend.GET.rackWithId(this.data.entityId, `name,id`)
          .pipe(map(x => x.data), takeUntil(this.destroy$))
          .subscribe(rack => {
            this._contextInformation$.next({
              description: rack.name,
              URL: ['racks', 'details', rack.id],
              entityLabel,
            });
          });
        break;
      default:
        break;
    }
  }

  openURL() {
    this.router.navigate(this._contextInformation$.value.URL);
  }
}