import {
  combineLatest,
  concat,
  Observable,
  of
} from 'rxjs';
import {
  catchError,
  map,
  switchMap
} from 'rxjs/operators';
import { MergeModuleResult } from '../../features/backend/supabase-merge';
import {
  ModulePriceHistorySnapshot,
  ModulePriceListing,
  ModuleRecentMarketPrice,
  ModuleSparsePriceHistorySummary
} from '../../features/backend/supabase-queries';
import { formatMarketplaceMinorUnits } from '../../features/marketplace/marketplace-money.utils';
import { DbModule, UserModulePossessionKind } from '../../models/module';
import { UserModuleAcquisition, UserModuleAcquisitionDraft } from '../../models/user-module-acquisition';
import { getModuleRecentMarketPrice } from '../../features/backend/module-price-summary.utils';
import { getModuleSparsePriceHistorySummary } from '../../features/backend/module-price-summary.utils';
import { ModulePossessionDialogResult } from './module-possession-dialog/module-possession-dialog.component';

export function getCurrentModulePossession(
  list: DbModule[],
  module: DbModule | null | undefined
): UserModulePossessionKind | null {
  if (!module) return null;
  const row = list.find(userModule => userModule.id === module.id);
  return row?.possessionKind ?? null;
}

export function createCurrentModulePossession$(
  list$: Observable<DbModule[]>,
  module$: Observable<DbModule | null | undefined>
): Observable<UserModulePossessionKind | null> {
  return combineLatest([list$, module$]).pipe(
    map(([list, module]) => getCurrentModulePossession(list, module))
  );
}

export function formatLatestAcquisitionValue(rows: UserModuleAcquisition[] | undefined): string | null {
  const latest = rows?.[0];
  if (!latest) return null;
  if (latest.price_amount_minor !== null && latest.currency) {
    return formatMarketplaceMinorUnits(latest.price_amount_minor, latest.currency);
  }
  return `Acquired ${ latest.acquired_at }`;
}

export function getRecentMarketPriceForListings(
  listings: ModulePriceListing[] | undefined,
  fallbackModuleId: number
): ModuleRecentMarketPrice | null {
  return listings === undefined
    ? null
    : getModuleRecentMarketPrice(listings[0]?.moduleId ?? fallbackModuleId, listings);
}

export function createRecentMarketPrice$(
  listings$: Observable<ModulePriceListing[] | undefined>,
  getFallbackModuleId: () => number
): Observable<ModuleRecentMarketPrice | null> {
  return listings$.pipe(
    map(listings => getRecentMarketPriceForListings(listings, getFallbackModuleId()))
  );
}

export function createSparsePriceHistorySummary$(
  snapshots$: Observable<ModulePriceHistorySnapshot[] | undefined>,
  module$: Observable<DbModule | null | undefined>
): Observable<ModuleSparsePriceHistorySummary | null> {
  return combineLatest([snapshots$, module$]).pipe(
    map(([snapshots, module]) => snapshots === undefined || !module
      ? null
      : getModuleSparsePriceHistorySummary(module.id, snapshots)
    )
  );
}

export function loadModulePriceListings$(
  moduleId$: Observable<number>,
  loadListings: (moduleId: number) => Observable<ModulePriceListing[]>
): Observable<ModulePriceListing[] | undefined> {
  return moduleId$.pipe(
    switchMap(moduleId => concat(
      of(undefined),
      loadListings(moduleId).pipe(
        catchError(error => {
          console.warn('Module price listings could not be loaded.', error);
          return of([]);
        })
      )
    ))
  );
}

export function loadModulePriceHistorySnapshots$(
  moduleId$: Observable<number>,
  loadHistory: (moduleId: number) => Observable<ModulePriceHistorySnapshot[]>
): Observable<ModulePriceHistorySnapshot[] | undefined> {
  return moduleId$.pipe(
    switchMap(moduleId => concat(
      of(undefined),
      loadHistory(moduleId).pipe(
        catchError(error => {
          console.warn('Module price history could not be loaded.', error);
          return of([]);
        })
      )
    ))
  );
}

export function possessionKindLabel(kind: UserModulePossessionKind): string {
  switch (kind) {
    case 'HAS':
      return 'owned';
    case 'WANTS':
      return 'wanted';
    case 'SELLS':
      return 'for sale';
  }
}

export function getPossessionRequestKind(
  request: UserModulePossessionKind | ModulePossessionDialogResult | null
): UserModulePossessionKind | null {
  if (request === null) return null;
  return typeof request === 'object' ? request.kind : request;
}

export function getMeaningfulAcquisitionDraft(
  request: UserModulePossessionKind | ModulePossessionDialogResult | null
): UserModuleAcquisitionDraft | undefined {
  if (typeof request !== 'object' || request?.kind !== 'HAS' || !request.acquisition) {
    return undefined;
  }

  const note = request.acquisition.note?.trim() || null;
  return {...request.acquisition, note};
}

export function shouldDeleteManufacturerWithModule(
  module: Pick<DbModule, 'id' | 'manufacturerId'>,
  relatedModules: Array<Pick<DbModule, 'id'>>
): boolean {
  return module.manufacturerId != null
    && relatedModules.every(relatedModule => relatedModule.id === module.id);
}

export function formatDeleteModuleSuccessMessage(module: DbModule, manufacturerDeleted: boolean): string {
  return manufacturerDeleted
    ? `"${ module.name }" and orphan manufacturer "${ module.manufacturer.name }" deleted from the database.`
    : `"${ module.name }" deleted from the database.`;
}

export function formatMergeResultMessage(result: MergeModuleResult): string {
  return `Merged module ${ result.sourceId } into ${ result.targetId }: moved ${ result.ownershipRowsMoved } ownership, ${ result.tagRowsMoved } tag, ${ result.rackModuleRowsMoved } rack rows; removed ${ result.duplicateOwnershipRowsRemoved } duplicate ownership and ${ result.duplicateTagRowsRemoved } duplicate tag rows.`;
}
