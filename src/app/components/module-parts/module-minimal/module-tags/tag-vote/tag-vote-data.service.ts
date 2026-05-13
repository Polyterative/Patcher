import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import {
  catchError,
  debounceTime,
  filter,
  map,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { Tag } from 'src/app/models/tag';


export interface TagVoteCount {
  moduleTagId: number;
  count: number;
}

/** A locally-created module_tag entry that does not yet exist in server data */
export interface ProposedTag {
  moduleTagId: number;
  tag: Tag;
}

@Injectable()
export class TagVoteDataService extends SubManager {
  // STATE
  private readonly _tagVotes$ = new BehaviorSubject<Map<number, number>>(new Map());
  private readonly _myVotes$ = new BehaviorSubject<Set<number>>(new Set());
  private readonly _allTags$ = new BehaviorSubject<Tag[]>([]);
  private readonly _proposedTags$ = new BehaviorSubject<ProposedTag[]>([]);

  // PUBLIC
  public readonly tagVotes$ = this._tagVotes$.asObservable();
  public readonly myVotes$ = this._myVotes$.asObservable();
  public readonly allTags$: Observable<Tag[]> = this._allTags$.asObservable();
  public readonly proposedTags$: Observable<ProposedTag[]> = this._proposedTags$.asObservable();
  public readonly isLoggedIn$: Observable<boolean>;

  // ACTIONS
  public loadVotes$ = new ReplaySubject<TagVoteCount[]>(1);
  public toggleVote$ = new Subject<number>();
  public proposeTag$ = new Subject<{
    moduleId: number;
    tagId: number
  }>();


  constructor(
    private backend: SupabaseService,
    private userService: UserManagementService,
    private snackBar: MatSnackBar
  ) {
    super();
    this.isLoggedIn$ = this.userService.loggedUser$.pipe(map(user => !!user));
    this.initializeLoadHandler();
    this.initializeToggleHandler();
    this.initializeAuthGate();
    this.initializeProposeHandler();
    this.loadAllTags();
  }
  
  private loadAllTags(): void {
    this.backend.get.allTags().pipe(
      tap(tags => this._allTags$.next(tags ?? [])),
      catchError(() => EMPTY),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private initializeLoadHandler(): void {
    this.loadVotes$.pipe(
      tap(preloadedCounts => {
        const countMap = new Map<number, number>();
        for (const {moduleTagId, count} of preloadedCounts) {
          countMap.set(moduleTagId, count);
        }
        this._tagVotes$.next(countMap);
      }),
      switchMap(() =>
        this.userService.loggedUser$.pipe(
          take(1),
          switchMap(user => {
            if (!user) {
              return of([] as number[]);
            }
            return this.backend.get.myVotes().pipe(
              catchError(() => {
                SharedConstants.errorCustom(this.snackBar, 'Failed to load tag votes');
                return EMPTY;
              })
            );
          }),
          tap(myVoteIds => {
            this._myVotes$.next(new Set(myVoteIds));
            // Preloaded counts may be 0 if the module query ran before auth was
            // established. If the user has voted, the count is at least 1.
            const counts = this._tagVotes$.getValue();
            const updated = new Map(counts);
            let changed = false;
            for (const id of myVoteIds) {
              if ((updated.get(id) ?? 0) === 0) {
                updated.set(id, 1);
                changed = true;
              }
            }
            if (changed) {
              this._tagVotes$.next(updated);
            }
          })
        )
      ),
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  private initializeToggleHandler(): void {
    this.toggleVote$.pipe(
      debounceTime(150),
      withLatestFrom(this.userService.loggedUser$, this._myVotes$, this._tagVotes$),
      filter(([, user]) => !!user),
      tap(([moduleTagId, , myVotes, tagVotes]) => {
        const newMyVotes = new Set(myVotes);
        const currentCount = tagVotes.get(moduleTagId) ?? 0;
        const newTagVotes = new Map(tagVotes);
        if (newMyVotes.has(moduleTagId)) {
          newMyVotes.delete(moduleTagId);
          newTagVotes.set(moduleTagId, Math.max(0, currentCount - 1));
        } else {
          newMyVotes.add(moduleTagId);
          newTagVotes.set(moduleTagId, currentCount + 1);
        }
        this._myVotes$.next(newMyVotes);
        this._tagVotes$.next(newTagVotes);
      }),
      switchMap(([moduleTagId, , myVotes]) =>
        // myVotes is the BEFORE state — captured by withLatestFrom before tap updated it
        (myVotes.has(moduleTagId)
            ? this.backend.delete.userModuleTag(moduleTagId)
            : this.backend.add.userModuleTag(moduleTagId)
        ).pipe(
          catchError(() => {
            SharedConstants.errorCustom(this.snackBar, 'Vote failed');
            return EMPTY;
          })
        )
      ),
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  private initializeAuthGate(): void {
    this.userService.loggedUser$.pipe(
      filter(user => !user),
      tap(() => this._myVotes$.next(new Set())),
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  private initializeProposeHandler(): void {
    this.proposeTag$.pipe(
      withLatestFrom(this.userService.loggedUser$, this._allTags$),
      filter(([, user]) => !!user),
      switchMap(([{moduleId, tagId}, , allTags]) => {
        const fullTag = allTags.find(t => t.id === tagId);
        return this.backend.add.moduleTagLink(moduleId, tagId).pipe(
          catchError(() => {
            SharedConstants.errorCustom(this.snackBar, 'Failed to add tag');
            return EMPTY;
          }),
          switchMap(({id: moduleTagId}) => {
            // Optimistic update fires immediately — chip appears voted before network confirms
            const currentVotes = new Map(this._tagVotes$.getValue());
            currentVotes.set(moduleTagId, 1);
            this._tagVotes$.next(currentVotes);

            const currentMyVotes = new Set(this._myVotes$.getValue());
            currentMyVotes.add(moduleTagId);
            this._myVotes$.next(currentMyVotes);
            
            // Add to local proposed list so visibleTags and availableTags$ update immediately
            if (fullTag) {
              const current = this._proposedTags$.getValue();
              this._proposedTags$.next([...current, {moduleTagId, tag: fullTag}]);
            }

            return this.backend.add.userModuleTag(moduleTagId).pipe(
              catchError(() => {
                // Rollback optimistic update on failure
                const rolledBackVotes = new Map(this._tagVotes$.getValue());
                rolledBackVotes.delete(moduleTagId);
                this._tagVotes$.next(rolledBackVotes);

                const rolledBackMyVotes = new Set(this._myVotes$.getValue());
                rolledBackMyVotes.delete(moduleTagId);
                this._myVotes$.next(rolledBackMyVotes);
                
                this._proposedTags$.next(
                  this._proposedTags$.getValue().filter(p => p.moduleTagId !== moduleTagId)
                );

                SharedConstants.errorCustom(this.snackBar, 'Vote after tag proposal failed');
                return EMPTY;
              })
            );
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }
}