import {
  Inject,
  Injectable
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  EMPTY,
  forkJoin,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  map,
  mergeMap,
  switchMap,
  tap
} from 'rxjs/operators';
import { COOL_REACTIONS_ENABLED } from 'src/app/components/shared-atoms/cool-button/cool-button-feature.token';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  REACTION_KIND_COOL,
  ReactionEntityTypes,
  type ReactionRow
} from 'src/app/features/backend/supabase-reactions';
import { MinimalModule } from 'src/app/models/module';
import { Rack } from 'src/app/models/rack';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

export type UserCoolCollectionEntityType = 'module' | 'rack';

export interface UserCoolCollectionModuleItem {
  entityType: 'module';
  entityId: number;
  reactionCreatedAt: string;
  module: MinimalModule;
}

export interface UserCoolCollectionRackItem {
  entityType: 'rack';
  entityId: number;
  reactionCreatedAt: string;
  rack: Rack;
}

export type UserCoolCollectionItem = UserCoolCollectionModuleItem | UserCoolCollectionRackItem;

export interface UserCoolCollectionGroup {
  entityType: UserCoolCollectionEntityType;
  title: string;
  icon: string;
  emptyCopy: string;
  items: UserCoolCollectionItem[];
}

export interface UserCoolCollectionViewModel {
  enabled: boolean;
  loading: boolean;
  groups: UserCoolCollectionGroup[];
  total: number;
}

const EMPTY_GROUPS: UserCoolCollectionGroup[] = [
  {
    entityType: 'module',
    title: 'Modules',
    icon: 'view_module',
    emptyCopy: 'Cooled modules will appear here.',
    items: []
  },
  {
    entityType: 'rack',
    title: 'Racks',
    icon: 'view_stream',
    emptyCopy: 'Cooled public racks will appear here.',
    items: []
  }
];

@Injectable()
export class UserCoolCollectionDataService extends SubManager {
  private readonly _vm$ = new BehaviorSubject<UserCoolCollectionViewModel>({
    enabled: false,
    loading: false,
    groups: EMPTY_GROUPS,
    total: 0
  });

  readonly vm$ = this._vm$.asObservable();
  readonly load$ = new Subject<void>();
  readonly removeCool$ = new Subject<UserCoolCollectionItem>();

  constructor(
    private readonly backend: SupabaseService,
    private readonly snackBar: MatSnackBar,
    @Inject(COOL_REACTIONS_ENABLED) private readonly coolReactionsEnabled: boolean
  ) {
    super();
    this._vm$.next({
      ...this._vm$.value,
      enabled: this.coolReactionsEnabled
    });

    this.load$.pipe(
      tap(() => {
        if (this.coolReactionsEnabled) {
          this._vm$.next({
            ...this._vm$.value,
            loading: true
          });
        }
      }),
      switchMap(() => this.coolReactionsEnabled
        ? this.loadCollection()
        : of({
          enabled: false,
          loading: false,
          groups: EMPTY_GROUPS,
          total: 0
        })
      ),
      catchError(() => {
        SharedConstants.errorCustom(this.snackBar, 'Cool collection could not be loaded.');
        return of({
          ...this._vm$.value,
          loading: false
        });
      }),
      this.takeUntilDestroyed()
    ).subscribe(vm => this._vm$.next(vm));

    this.removeCool$.pipe(
      mergeMap(item => {
        if (!this.coolReactionsEnabled) {
          return EMPTY;
        }

        this._vm$.next(this.removeItem(this._vm$.value, item));

        return this.backend.delete.reaction(
          this.toBackendEntityType(item.entityType),
          item.entityId,
          REACTION_KIND_COOL
        ).pipe(
          tap(() => SharedConstants.successCustom(this.snackBar, 'Removed cool.')),
          catchError(() => {
            this._vm$.next(this.restoreItem(this._vm$.value, item));
            SharedConstants.errorCustom(this.snackBar, 'Cool could not be removed.');
            return EMPTY;
          })
        );
      }),
      this.takeUntilDestroyed()
    ).subscribe();
  }

  trackGroup(_index: number, group: UserCoolCollectionGroup): UserCoolCollectionEntityType {
    return group.entityType;
  }

  trackItem(_index: number, item: UserCoolCollectionItem): string {
    return `${ item.entityType }-${ item.entityId }`;
  }

  itemTitle(item: UserCoolCollectionItem): string {
    return item.entityType === 'module'
      ? item.module.name
      : item.rack.name;
  }

  itemSubtitle(item: UserCoolCollectionItem): string {
    if (item.entityType === 'module') {
      return item.module.manufacturer?.name ?? 'Module';
    }

    return `${ item.rack.hp } HP · ${ item.rack.rows } row${ item.rack.rows === 1 ? '' : 's' }`;
  }

  itemDescription(item: UserCoolCollectionItem): string {
    const description = item.entityType === 'module'
      ? item.module.description
      : item.rack.description;

    return description?.trim() || 'No description yet.';
  }

  itemRouterLink(item: UserCoolCollectionItem): string[] {
    if (item.entityType === 'module') {
      return ['/modules/details', `${ item.entityId }`];
    }

    return item.rack.public_id
      ? ['/racks', item.rack.public_id]
      : ['/racks/details', `${ item.entityId }`];
  }

  private loadCollection() {
    return forkJoin({
      moduleReactions: this.backend.get.currentUserReactions(ReactionEntityTypes.MODULE, REACTION_KIND_COOL),
      rackReactions: this.backend.get.currentUserReactions(ReactionEntityTypes.RACK, REACTION_KIND_COOL)
    }).pipe(
      switchMap(({moduleReactions, rackReactions}) => {
        const sortedModuleReactions = this.sortReactionsNewestFirst(moduleReactions);
        const sortedRackReactions = this.sortReactionsNewestFirst(rackReactions);
        const moduleIds = sortedModuleReactions.map(reaction => reaction.entity_id);
        const rackIds = sortedRackReactions.map(reaction => reaction.entity_id);

        return forkJoin({
          modules: moduleIds.length ? this.backend.GET.publicModulesByIds(moduleIds) : of([]),
          racks: rackIds.length ? this.backend.get.publicRacksByIds(rackIds) : of([]),
        }).pipe(
          map(({modules, racks}) => this.buildVm(sortedModuleReactions, sortedRackReactions, modules, racks))
        );
      })
    );
  }

  private sortReactionsNewestFirst(reactions: ReactionRow[]): ReactionRow[] {
    return [...reactions].sort(this.sortReactionNewestFirst);
  }

  private buildVm(
    moduleReactions: ReactionRow[],
    rackReactions: ReactionRow[],
    modules: MinimalModule[],
    racks: Rack[]
  ): UserCoolCollectionViewModel {
    const moduleById = new Map(modules.map(module => [module.id, module]));
    const rackById = new Map(racks.map(rack => [rack.id, rack]));
    const moduleItems: UserCoolCollectionModuleItem[] = moduleReactions
      .map(reaction => {
        const module = moduleById.get(reaction.entity_id);
        return module
          ? {
            entityType: 'module' as const,
            entityId: reaction.entity_id,
            reactionCreatedAt: reaction.created_at,
            module
          }
          : null;
      })
      .filter((item): item is UserCoolCollectionModuleItem => item !== null);
    const rackItems: UserCoolCollectionRackItem[] = rackReactions
      .map(reaction => {
        const rack = rackById.get(reaction.entity_id);
        return rack
          ? {
            entityType: 'rack' as const,
            entityId: reaction.entity_id,
            reactionCreatedAt: reaction.created_at,
            rack
          }
          : null;
      })
      .filter((item): item is UserCoolCollectionRackItem => item !== null);
    const groups = this.buildGroups(moduleItems, rackItems);

    return {
      enabled: true,
      loading: false,
      groups,
      total: groups.reduce((sum, group) => sum + group.items.length, 0)
    };
  }

  private buildGroups(
    moduleItems: UserCoolCollectionModuleItem[],
    rackItems: UserCoolCollectionRackItem[]
  ): UserCoolCollectionGroup[] {
    return EMPTY_GROUPS.map(group => ({
      ...group,
      items: group.entityType === 'module'
        ? [...moduleItems]
        : [...rackItems]
    }));
  }

  private removeItem(
    vm: UserCoolCollectionViewModel,
    item: UserCoolCollectionItem
  ): UserCoolCollectionViewModel {
    const groups = vm.groups.map(group => ({
      ...group,
      items: group.items.filter(current =>
        current.entityType !== item.entityType || current.entityId !== item.entityId
      )
    }));

    return {
      ...vm,
      groups,
      total: groups.reduce((sum, group) => sum + group.items.length, 0)
    };
  }

  private restoreItem(
    vm: UserCoolCollectionViewModel,
    item: UserCoolCollectionItem
  ): UserCoolCollectionViewModel {
    if (vm.groups.some(group => group.items.some(current =>
      current.entityType === item.entityType && current.entityId === item.entityId
    ))) {
      return vm;
    }

    const groups = vm.groups.map(group => {
      if (group.entityType !== item.entityType) {
        return group;
      }

      return {
        ...group,
        items: [...group.items, item].sort(this.sortItemNewestFirst)
      };
    });

    return {
      ...vm,
      groups,
      total: groups.reduce((sum, group) => sum + group.items.length, 0)
    };
  }

  private sortItemNewestFirst(first: UserCoolCollectionItem, second: UserCoolCollectionItem): number {
    return new Date(second.reactionCreatedAt).getTime() - new Date(first.reactionCreatedAt).getTime();
  }

  private sortReactionNewestFirst(first: ReactionRow, second: ReactionRow): number {
    return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
  }

  private toBackendEntityType(entityType: UserCoolCollectionEntityType): number {
    return entityType === 'module'
      ? ReactionEntityTypes.MODULE
      : ReactionEntityTypes.RACK;
  }
}
