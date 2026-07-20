import {
  combineLatest,
  map,
  Observable
} from 'rxjs';
import { DbComment } from 'src/app/models/comment';
import {
  DbModule,
  MinimalModule,
  UserModulePossessionKind
} from 'src/app/models/module';
import { Patch } from 'src/app/models/patch';
import { Rack } from 'src/app/models/rack';
import { DiscoveryTipUserAreaSnapshot } from 'src/app/shared-interproject/discovery-tips/discovery-tip.models';
import { matchesSearchQuery } from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';


export function pagedSlice$<T>(
  data$: Observable<T[] | undefined>,
  skip$: Observable<number>,
  take$: Observable<number>
): Observable<T[] | undefined> {
  return combineLatest([data$, skip$, take$]).pipe(
    map(([data, skip, take]) => data ? data.slice(skip, skip + take) : undefined)
  );
}

export function hasMoreFromTake$(
  count$: Observable<number>,
  take$: Observable<number>
): Observable<boolean> {
  return combineLatest([count$, take$]).pipe(
    map(([count, take]) => count > take)
  );
}

export function remainingFromTake$(
  count$: Observable<number>,
  take$: Observable<number>
): Observable<number> {
  return combineLatest([count$, take$]).pipe(
    map(([count, take]) => Math.max(0, count - take))
  );
}

export function hasMoreLoaded$<T>(
  count$: Observable<number>,
  data$: Observable<T[] | undefined>
): Observable<boolean> {
  return combineLatest([count$, data$]).pipe(
    map(([count, data]) => count > (data?.length ?? 0))
  );
}

export function remainingLoaded$<T>(
  count$: Observable<number>,
  data$: Observable<T[] | undefined>
): Observable<number> {
  return combineLatest([count$, data$]).pipe(
    map(([count, data]) => Math.max(0, count - (data?.length ?? 0)))
  );
}

export function buildDiscoverySnapshot(
  modules: MinimalModule[] | undefined,
  racks: Rack[] | undefined,
  patches: Patch[] | undefined,
  manuals: DbModule[] | undefined,
  comments: DbComment[] | undefined,
  query: string
): DiscoveryTipUserAreaSnapshot {
  const modulesCount = modules?.length ?? 0;
  const racksCount = racks?.length ?? 0;
  const patchesCount = patches?.length ?? 0;
  const manualsCount = manuals?.length ?? 0;
  const commentsCount = comments?.length ?? 0;

  return {
    modulesLoaded: modules !== undefined,
    racksLoaded: racks !== undefined,
    patchesLoaded: patches !== undefined,
    manualsLoaded: manuals !== undefined,
    commentsLoaded: comments !== undefined,
    modulesCount,
    racksCount,
    patchesCount,
    manualsCount,
    commentsCount,
    totalCount: modulesCount + racksCount + patchesCount,
    hasSearchQuery: query.length > 0
  };
}

export function filterModules(
  modules: MinimalModule[] | undefined,
  query: string
): MinimalModule[] | undefined {
  if (!modules) {
    return undefined;
  }

  return modules.filter((module) => {
    const searchFields = [
      module.name,
      module.manufacturer?.name,
      module.description,
      ...(module.tags ?? []).map((tagVote) => tagVote.tag?.name ?? '')
    ];

    return matchesSearchQuery(query, ...searchFields);
  });
}

export function filterModulesByPossession(
  modules: MinimalModule[] | undefined,
  collectionFilter: 'MY_MODULES' | 'WISHLIST' | 'FOR_SALE'
): MinimalModule[] | undefined {
  if (!modules) {
    return undefined;
  }

  if (collectionFilter === 'MY_MODULES') {
    return modules.filter(module => normalizePossessionKind(module.possessionKind) === 'HAS');
  }

  if (collectionFilter === 'WISHLIST') {
    return modules.filter(module => normalizePossessionKind(module.possessionKind) === 'WANTS');
  }

  return modules.filter(module => normalizePossessionKind(module.possessionKind) === 'SELLS');
}

function normalizePossessionKind(kind: UserModulePossessionKind | undefined): UserModulePossessionKind {
  return kind === 'WANTS' || kind === 'SELLS' ? kind : 'HAS';
}

export function filterRacks(
  racks: Rack[] | undefined,
  query: string
): Rack[] | undefined {
  if (!racks) {
    return undefined;
  }

  return racks.filter((rack) => matchesSearchQuery(query, rack.name, rack.description));
}

export function filterPatches(
  patches: Patch[] | undefined,
  tag: string | null,
  query: string
): Patch[] | undefined {
  if (!patches) {
    return undefined;
  }

  return patches.filter((patch) => {
    const matchesTag = !tag || (patch.tags ?? []).includes(tag);
    if (!matchesTag) {
      return false;
    }

    const searchFields = [patch.name, patch.description, ...(patch.tags ?? [])];
    return matchesSearchQuery(query, ...searchFields);
  });
}

export function collectPatchTags(patches: Patch[] | undefined): string[] {
  return patches
    ? Array.from(new Set(patches.flatMap(patch => patch.tags ?? []))).sort()
    : [];
}

export function filterManuals(
  manuals: DbModule[] | undefined,
  query: string
): DbModule[] | undefined {
  if (!manuals) {
    return undefined;
  }

  return manuals.filter((manual) => matchesSearchQuery(
    query,
    manual.name,
    manual.manufacturer?.name,
    manual.description
  ));
}

export function filterComments(
  comments: DbComment[] | undefined,
  query: string
): DbComment[] | undefined {
  if (!comments) {
    return undefined;
  }

  return comments.filter((comment) => matchesSearchQuery(
    query,
    comment.content,
    comment.profile?.username
  ));
}
