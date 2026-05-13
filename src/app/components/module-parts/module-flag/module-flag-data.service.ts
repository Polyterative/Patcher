import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  EMPTY,
  merge,
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import {
  catchError,
  shareReplay,
  switchMap,
  takeUntil,
  withLatestFrom
} from 'rxjs/operators';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  FlagCategoryGroup,
  FlagCategoryOption,
  FlagCategory,
  FlagPayload,
  FLAG_CATEGORIES,
  FLAG_CATEGORY_GROUPS
} from './module-flag-data.types';

export type { FlagCategoryGroup, FlagCategoryOption, FlagCategory, FlagPayload };
export { FLAG_CATEGORIES, FLAG_CATEGORY_GROUPS };


@Injectable()
export class ModuleFlagDataService extends SubManager {
  // STATE
  private readonly _formVisible$ = new BehaviorSubject<boolean>(false);
  private readonly _refreshCount$ = new Subject<void>();

  // ACTION SUBJECTS
  readonly moduleId$ = new ReplaySubject<number>(1);
  readonly toggleForm$ = new Subject<void>();
  readonly submitFlag$ = new Subject<FlagPayload>();

  // PUBLIC STREAMS
  readonly formVisible$ = this._formVisible$.asObservable();
  readonly openFlagCount$ = this.moduleId$.pipe(
    switchMap(id => merge(of(null), this._refreshCount$).pipe(
      switchMap(() => this.backend.get.moduleFlagCount(id).pipe(catchError(() => of(0))))
    )),
    shareReplay(1)
  );

  constructor(
    private backend: SupabaseService,
    private snackBar: MatSnackBar
  ) {
    super();

    this.toggleForm$.pipe(
      withLatestFrom(this._formVisible$),
      takeUntil(this.destroy$)
    ).subscribe(([, visible]) => {
      this._formVisible$.next(!visible);
    });

    this.submitFlag$.pipe(
      withLatestFrom(this.moduleId$),
      switchMap(([payload, moduleId]) =>
        this.backend.add.moduleFlag({
          module_id: moduleId,
          category: payload.category,
          note: payload.note || null
        }).pipe(
          catchError(() => {
            SharedConstants.errorCustom(this.snackBar, 'Failed to submit report. Please try again.');
            return EMPTY;
          })
        )
      ),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      SharedConstants.successCustom(this.snackBar, 'Report submitted. Thanks for helping improve the catalogue!');
      this._formVisible$.next(false);
      this._refreshCount$.next();
    });
  }
}
