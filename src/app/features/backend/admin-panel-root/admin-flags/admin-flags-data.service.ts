import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  forkJoin,
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
import {
  FLAG_CATEGORY_GROUPS,
  FlagCategoryOption
} from 'src/app/components/module-parts/module-flag/module-flag-data.service';

export type { AdminFlagRow };
export type FlagStatusFilter = 'all' | 'open' | 'resolved';

export interface AdminFlagViewRow extends AdminFlagRow {
  reporterName: string | null;
}

interface AdminFlagCategoryOption extends FlagCategoryOption {
  groupLabel: string;
}

interface AdminFlagCategoryGroup {
  label: string;
  options: AdminFlagCategoryOption[];
}

const LEGACY_FLAG_CATEGORY_GROUPS: AdminFlagCategoryGroup[] = [
  {
    label: 'Legacy categories',
    options: [
      {value: 'wrong-specs', label: 'Wrong specs', icon: 'tune', groupLabel: 'Legacy categories'},
      {value: 'missing-image', label: 'Missing image', icon: 'image', groupLabel: 'Legacy categories'}
    ]
  }
];

const ADMIN_FLAG_CATEGORY_GROUPS: AdminFlagCategoryGroup[] = [
  ...FLAG_CATEGORY_GROUPS.map(group => ({
    label: group.label,
    options: group.options.map(option => ({
      ...option,
      groupLabel: group.label
    }))
  })),
  ...LEGACY_FLAG_CATEGORY_GROUPS
];

const ADMIN_FLAG_CATEGORY_OPTIONS = ADMIN_FLAG_CATEGORY_GROUPS.flatMap(group => group.options);
const ADMIN_FLAG_CATEGORY_MAP = new Map(
  ADMIN_FLAG_CATEGORY_OPTIONS.map(option => [option.value, option])
);


@Injectable()
export class AdminFlagsDataService extends SubManager {
  private readonly _flags$ = new BehaviorSubject<AdminFlagViewRow[]>([]);
  private readonly _refresh$ = new Subject<void>();

  // ── Filter state ──────────────────────────────────────────────────────────
  readonly statusFilter$ = new BehaviorSubject<FlagStatusFilter>('open');
  readonly categoryFilter$ = new BehaviorSubject<string | null>(null);
  readonly categoryGroups = ADMIN_FLAG_CATEGORY_GROUPS;

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
      switchMap(flags => this.enrichFlagsWithReporter$(flags)),
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

  getCategoryLabel(category: string): string {
    return ADMIN_FLAG_CATEGORY_MAP.get(category)?.label ?? this.humanizeCategory(category);
  }

  getCategoryGroupLabel(category: string): string {
    return ADMIN_FLAG_CATEGORY_MAP.get(category)?.groupLabel ?? 'Other';
  }

  getCategoryTone(category: string): string {
    const groupLabel = this.getCategoryGroupLabel(category);
    if (groupLabel === 'Module details') return 'details';
    if (groupLabel === 'Specs and setup') return 'specs';
    if (groupLabel === 'Images and links') return 'images';
    if (groupLabel === 'Catalogue') return 'catalogue';
    return 'legacy';
  }

  private humanizeCategory(category: string): string {
    return category
      .split('-')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private enrichFlagsWithReporter$(flags: AdminFlagRow[]) {
    const userIds = Array.from(new Set(flags.map(flag => flag.user_id).filter(Boolean)));
    if (userIds.length === 0) {
      return of(flags.map(flag => ({...flag, reporterName: null})));
    }

    return forkJoin(
      userIds.map(userId => this.backend.get.userWithId(userId, 'id,username').pipe(
        map(response => ({
          id: userId,
          username: (response as any).data?.username ?? null
        })),
        catchError(() => of({id: userId, username: null}))
      ))
    ).pipe(
      map(users => {
        const userMap = new Map(users.map(user => [user.id, user.username]));
        return flags.map(flag => ({
          ...flag,
          reporterName: userMap.get(flag.user_id) ?? null
        }));
      })
    );
  }
}
