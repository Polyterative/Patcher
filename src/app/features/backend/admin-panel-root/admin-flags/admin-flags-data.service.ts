import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  merge,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  map,
  shareReplay,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { AdminFlagRow } from 'src/app/features/backend/supabase-get';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';

export type { AdminFlagRow };
export type FlagStatusFilter = 'all' | 'open' | 'resolved';


@Injectable()
export class AdminFlagsDataService extends SubManager {
  private readonly _flags$ = new BehaviorSubject<AdminFlagRow[]>([]);
  private readonly _refresh$ = new Subject<void>();

  // ── Filter state ──────────────────────────────────────────────────────────
  readonly statusFilter$ = new BehaviorSubject<FlagStatusFilter>('open');
  readonly categoryFilter$ = new BehaviorSubject<string | null>(null);

  // ── Derived streams ───────────────────────────────────────────────────────
  readonly openFlagCount$ = this._flags$.pipe(
    map(f => f.filter(x => !x.resolved).length),
    shareReplay(1)
  );

  readonly filteredFlags$ = combineLatest([
    this._flags$,
    this.statusFilter$,
    this.categoryFilter$
  ]).pipe(
    map(([flags, status, category]) => {
      let result = flags;
      if (status === 'open') result = result.filter(f => !f.resolved);
      if (status === 'resolved') result = result.filter(f => f.resolved);
      if (category) result = result.filter(f => f.category === category);
      return result;
    }),
    shareReplay(1)
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  readonly resolveFlag$ = new Subject<{ id: number; resolved: boolean }>();
  readonly deleteFlag$ = new Subject<number>();

  constructor(
    private backend: SupabaseService,
    private snackBar: MatSnackBar
  ) {
    super();

    merge(of(null), this._refresh$).pipe(
      switchMap(() => this.backend.get.allModuleFlags().pipe(
        catchError(() => {
          SharedConstants.errorCustom(this.snackBar, 'Failed to load flags.');
          return of([]);
        })
      )),
      takeUntil(this.destroy$)
    ).subscribe(flags => this._flags$.next(flags));

    this.resolveFlag$.pipe(
      switchMap(({id, resolved}) => this.backend.update.moduleFlagResolved(id, resolved).pipe(
        catchError(() => {
          SharedConstants.errorCustom(this.snackBar, 'Failed to update flag.');
          return EMPTY;
        })
      )),
      takeUntil(this.destroy$)
    ).subscribe(() => this._refresh$.next());

    this.deleteFlag$.pipe(
      switchMap(id => this.backend.delete.moduleFlag(id).pipe(
        catchError(() => {
          SharedConstants.errorCustom(this.snackBar, 'Failed to delete flag.');
          return EMPTY;
        })
      )),
      takeUntil(this.destroy$)
    ).subscribe(() => this._refresh$.next());
  }
}
