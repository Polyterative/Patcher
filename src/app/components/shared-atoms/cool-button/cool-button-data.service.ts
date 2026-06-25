import {
  Inject,
  Injectable
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  exhaustMap,
  map,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  REACTION_KIND_COOL,
  type ReactionEntityType
} from 'src/app/features/backend/supabase-reactions';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { COOL_REACTIONS_ENABLED } from './cool-button-feature.token';

export type CoolCountDisplayMode = 'hidden' | 'count';

export interface CoolButtonConfig {
  entityType: ReactionEntityType | null;
  entityId: number | null;
  eligible: boolean;
  countDisplayMode: CoolCountDisplayMode;
}

export interface CoolButtonViewModel {
  visible: boolean;
  active: boolean;
  count: number | null;
  disabled: boolean;
  loading: boolean;
  label: string;
  ariaLabel: string;
}

const HIDDEN_VM: CoolButtonViewModel = {
  visible: false,
  active: false,
  count: null,
  disabled: true,
  loading: false,
  label: 'Cool',
  ariaLabel: 'Mark as cool'
};

@Injectable()
export class CoolButtonDataService extends SubManager {
  readonly vm$ = new BehaviorSubject<CoolButtonViewModel>(HIDDEN_VM);
  readonly requestToggle$ = new Subject<void>();

  private readonly _config$ = new ReplaySubject<CoolButtonConfig>(1);
  private latestConfig: CoolButtonConfig | null = null;

  constructor(
    private readonly backend: SupabaseService,
    private readonly snackBar: MatSnackBar,
    @Inject(COOL_REACTIONS_ENABLED) private readonly coolReactionsEnabled: boolean
  ) {
    super();

    this._config$.pipe(
      distinctUntilChanged((previous, current) =>
        previous.entityType === current.entityType
        && previous.entityId === current.entityId
        && previous.eligible === current.eligible
        && previous.countDisplayMode === current.countDisplayMode
      ),
      switchMap(config => {
        if (!this.canUseBackend(config)) {
          return of(HIDDEN_VM);
        }

        this.vm$.next({
          ...this.vm$.value,
          visible: true,
          disabled: true,
          loading: true
        });

        const count$ = config.countDisplayMode === 'count'
          ? this.backend.get.reactionCount(config.entityType, config.entityId, REACTION_KIND_COOL)
          : of(null);

        return combineLatest([
          this.backend.get.currentUserReactions(config.entityType, REACTION_KIND_COOL),
          count$
        ]).pipe(
          map(([reactions, count]) => {
            const active = reactions.some(reaction => reaction.entity_id === config.entityId);
            return this.buildVm(active, count);
          }),
          catchError(() => {
            this.snackBar.open('Cool state could not be loaded.', undefined, {duration: 4000, panelClass: 'snack-error'});
            return of(HIDDEN_VM);
          })
        );
      }),
      this.takeUntilDestroyed()
    ).subscribe(vm => this.vm$.next(vm));

    this.requestToggle$.pipe(
      withLatestFrom(this._config$, this.vm$),
      exhaustMap(([_, config, vm]) => {
        if (!this.canUseBackend(config) || vm.disabled || vm.loading) {
          return EMPTY;
        }

        const nextActive = !vm.active;
        const nextCount = vm.count === null
          ? null
          : Math.max(0, vm.count + (nextActive ? 1 : -1));
        this.vm$.next(this.buildVm(nextActive, nextCount, true));

        const request$ = nextActive
          ? this.backend.add.reaction(config.entityType, config.entityId, REACTION_KIND_COOL)
          : this.backend.delete.reaction(config.entityType, config.entityId, REACTION_KIND_COOL);

        return request$.pipe(
          tap(() => {
            if (this.configsEqual(this.latestConfig, config) && this.canUseBackend(config)) {
              this.vm$.next(this.buildVm(nextActive, nextCount));
            }
            SharedConstants.successCustom(this.snackBar, nextActive ? 'Marked cool.' : 'Removed cool.');
          }),
          catchError(() => {
            if (this.configsEqual(this.latestConfig, config) && this.canUseBackend(config)) {
              this.vm$.next(vm);
            }
            this.snackBar.open('Cool update failed — try again.', undefined, {duration: 5000, panelClass: 'snack-error'});
            return EMPTY;
          })
        );
      }),
      this.takeUntilDestroyed()
    ).subscribe();
  }

  setEntity(config: CoolButtonConfig): void {
    this.latestConfig = config;
    this._config$.next(config);
  }

  private configsEqual(first: CoolButtonConfig | null, second: CoolButtonConfig): boolean {
    return first?.entityType === second.entityType
      && first.entityId === second.entityId
      && first.eligible === second.eligible
      && first.countDisplayMode === second.countDisplayMode;
  }

  private canUseBackend(config: CoolButtonConfig): config is CoolButtonConfig & {
    entityType: ReactionEntityType;
    entityId: number;
  } {
    return this.coolReactionsEnabled
      && config.eligible
      && config.entityType != null
      && config.entityId != null;
  }

  private buildVm(active: boolean, count: number | null, disabled = false): CoolButtonViewModel {
    return {
      visible: true,
      active,
      count,
      disabled,
      loading: false,
      label: 'Cool',
      ariaLabel: active ? 'Remove cool' : 'Mark as cool'
    };
  }
}
