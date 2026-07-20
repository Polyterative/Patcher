import {
  Inject,
  Injectable
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  EMPTY,
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
import { recoverListRequest } from 'src/app/features/browser-data-recovery';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  REACTION_KIND_COOL,
  ReactionEntityTypes,
  type ReactionRow
} from 'src/app/features/backend/supabase-reactions';
import { COOL_REACTION_SNACK_COPY } from 'src/app/components/shared-atoms/cool-button/cool-reaction-copy';
import { MinimalModule } from 'src/app/models/module';
import { Patch } from 'src/app/models/patch';
import { Rack } from 'src/app/models/rack';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

export type UserCoolCollectionEntityType = 'module' | 'rack' | 'patch';

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

export interface UserCoolCollectionPatchItem {
  entityType: 'patch';
  entityId: number;
  reactionCreatedAt: string;
  patch: Patch;
}

export type UserCoolCollectionItem =
  | UserCoolCollectionModuleItem
  | UserCoolCollectionRackItem
  | UserCoolCollectionPatchItem;

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

const GROUP_META: Record<UserCoolCollectionEntityType, Omit<UserCoolCollectionGroup, 'items'>> = {
  module: {
    entityType: 'module',
    title: 'Modules',
    icon: 'view_module',
    emptyCopy: 'Modules you mark Cool will land here.'
  },
  rack: {
    entityType: 'rack',
    title: 'Racks',
    icon: 'view_stream',
    emptyCopy: 'Public racks you mark Cool will land here.'
  },
  patch: {
    entityType: 'patch',
    title: 'Patches',
    icon: 'settings_input_composite',
    emptyCopy: 'Public patches you mark Cool will land here.'
  }
};

function emptyGroups(entityType: UserCoolCollectionEntityType): UserCoolCollectionGroup[] {
  return [{...GROUP_META[entityType], items: []}];
}

@Injectable()
export class UserCoolCollectionDataService extends SubManager {
  private readonly _vm$ = new BehaviorSubject<UserCoolCollectionViewModel>({
    enabled: false,
    loading: false,
    groups: emptyGroups('module'),
    total: 0
  });

  readonly vm$ = this._vm$.asObservable();
  readonly moduleData$ = this.vm$.pipe(
    map(vm => vm.groups.flatMap(group => group.items)
      .filter((item): item is UserCoolCollectionModuleItem => item.entityType === 'module')
      .map(item => item.module))
  );
  readonly rackData$ = this.vm$.pipe(
    map(vm => vm.groups.flatMap(group => group.items)
      .filter((item): item is UserCoolCollectionRackItem => item.entityType === 'rack')
      .map(item => item.rack))
  );
  readonly patchData$ = this.vm$.pipe(
    map(vm => vm.groups.flatMap(group => group.items)
      .filter((item): item is UserCoolCollectionPatchItem => item.entityType === 'patch')
      .map(item => item.patch))
  );
  readonly load$ = new Subject<UserCoolCollectionEntityType | undefined>();
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
      map((entityType): UserCoolCollectionEntityType => entityType ?? 'module'),
      switchMap(entityType => {
        const previousVm = {
          ...this._vm$.value,
          loading: false
        };

        if (!this.coolReactionsEnabled) {
          return of({
            enabled: false,
            loading: false,
            groups: emptyGroups(entityType),
            total: 0
          });
        }

        this._vm$.next({
          ...previousVm,
          loading: true
        });

        return recoverListRequest(
          () => this.loadCollection(entityType),
          previousVm,
          '[user-cool-collection] Failed to load Cool collection',
          {
            beforeRetry: () => this.backend.cacheResetter$.next(this.publicEntityCacheKeys(entityType)),
            onExhausted: () => SharedConstants.errorCustom(this.snackBar, 'Cool collection could not be loaded.')
          }
        );
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
          tap(() => SharedConstants.successCustom(this.snackBar, COOL_REACTION_SNACK_COPY.removed)),
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

  private loadCollection(entityType: UserCoolCollectionEntityType) {
    return this.backend.get.currentUserReactions(this.toBackendEntityType(entityType), REACTION_KIND_COOL, true).pipe(
      switchMap(reactions => {
        const sortedReactions = this.sortReactionsNewestFirst(reactions);
        const entityIds = sortedReactions.map(reaction => reaction.entity_id);

        return this.loadPublicEntities(entityType, entityIds).pipe(
          map(entities => this.buildVm(entityType, sortedReactions, entities))
        );
      })
    );
  }

  private loadPublicEntities(
    entityType: UserCoolCollectionEntityType,
    entityIds: number[]
  ) {
    if (entityIds.length === 0) {
      return of([]);
    }

    if (entityType === 'module') {
      return this.backend.GET.publicModulesByIds(entityIds, true);
    }

    if (entityType === 'rack') {
      return this.backend.get.publicRacksByIds(entityIds, true);
    }

    return this.backend.GET.publicPatchesByIds(entityIds, true);
  }

  private publicEntityCacheKeys(
    entityType: UserCoolCollectionEntityType
  ): Parameters<SupabaseService['cacheResetter$']['next']>[0] {
    if (entityType === 'module') {
      return ['modules'];
    }

    if (entityType === 'rack') {
      return ['rackWithId'];
    }

    return ['patches'];
  }

  private sortReactionsNewestFirst(reactions: ReactionRow[]): ReactionRow[] {
    return [...reactions].sort(this.sortReactionNewestFirst);
  }

  private buildVm(
    entityType: UserCoolCollectionEntityType,
    reactions: ReactionRow[],
    entities: (MinimalModule | Rack | Patch)[]
  ): UserCoolCollectionViewModel {
    const entityById = new Map(entities.map(entity => [entity.id, entity]));
    const items = reactions
      .map(reaction => this.toItem(entityType, reaction, entityById.get(reaction.entity_id)))
      .filter((item): item is UserCoolCollectionItem => item !== null);
    const groups = [{...GROUP_META[entityType], items}];

    return {
      enabled: true,
      loading: false,
      groups,
      total: groups.reduce((sum, group) => sum + group.items.length, 0)
    };
  }

  private toItem(
    entityType: UserCoolCollectionEntityType,
    reaction: ReactionRow,
    entity: MinimalModule | Rack | Patch | undefined
  ): UserCoolCollectionItem | null {
    if (!entity) {
      return null;
    }

    if (entityType === 'module') {
      return {
        entityType,
        entityId: reaction.entity_id,
        reactionCreatedAt: reaction.created_at,
        module: entity as MinimalModule
      };
    }

    if (entityType === 'rack') {
      return {
        entityType,
        entityId: reaction.entity_id,
        reactionCreatedAt: reaction.created_at,
        rack: entity as Rack
      };
    }

    return {
      entityType,
      entityId: reaction.entity_id,
      reactionCreatedAt: reaction.created_at,
      patch: entity as Patch
    };
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
    if (entityType === 'module') {
      return ReactionEntityTypes.MODULE;
    }

    if (entityType === 'rack') {
      return ReactionEntityTypes.RACK;
    }

    return ReactionEntityTypes.PATCH;
  }
}
