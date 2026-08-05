import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MonoTypeOperatorFunction,
  NEVER,
  Observable,
  Subject
} from 'rxjs';
import {
  catchError,
  map,
  tap
} from 'rxjs/operators';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  GlobalCacheConfig,
  InMemoryStorageStrategy
} from 'ts-cacheable';


export const LEGACY_TS_CACHEABLE_STORAGE_KEY = 'CACHE_STORAGE';

type RemovableStorage = Pick<Storage, 'removeItem'>;

function isSecurityError(error: unknown): boolean {
  return (
    typeof DOMException !== 'undefined'
    && error instanceof DOMException
    && error.name === 'SecurityError'
  ) || (error instanceof Error && error.name === 'SecurityError');
}

function getBrowserLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    if (isSecurityError(error)) {
      return null;
    }

    throw error;
  }
}

export function removeLegacyTsCacheableStorage(storage: RemovableStorage | null): void {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(LEGACY_TS_CACHEABLE_STORAGE_KEY);
  } catch (error) {
    // Some browsers can deny localStorage access entirely; do not hide normal removeItem failures.
    if (isSecurityError(error)) {
      return;
    }

    throw error;
  }
}

GlobalCacheConfig.storageStrategy = InMemoryStorageStrategy;
removeLegacyTsCacheableStorage(getBrowserLocalStorage());

export const defaultCacheTime = 5 * 60 * 1000;
export const longCacheTime = defaultCacheTime * 10;
export const priceHubCacheTime = 60 * 60 * 1000;
export const smallCacheTime = defaultCacheTime / 5;

export type CachedEntity =
  'comments'
  | 'modules'
  | 'module_flags'
  | 'manufacturers'
  | 'profiles'
  | 'currentUserModules'
  | 'userModuleAcquisitions'
  | 'moduleWithId'
  | 'patchConnections'
  | 'patchModuleInstances'
  | 'patches'
  | 'currentUserComments'
  | 'rackWithId'
  | 'racksMinimal'
  | 'racksWithModule'
  | 'patchesWithModule'
  | 'modulesBySameManufacturer'
  | 'userModuleTags'
  | 'modulePossessionCounts'
  | 'priceHub'
  | 'moduleCollections'
  | 'moduleCollectionWithId'
  | 'moduleCollectionsByModule'
  | 'currentUserReactions'
  | 'reactionCounts'
  | 'reactionDiscovery'
  | 'shippingAddresses'
  | 'marketplaceListings'
  | 'marketplaceListingWithId'
  | 'currentUserMarketplaceListings'
  | 'apiKeys'
  | void;

export const cacheBuster$ = new Subject<CachedEntity[]>();

export function cacheBust<T>(cacheKeys: CachedEntity[]): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) => source.pipe(
    tap(() => cacheBuster$.next(cacheKeys))
  );
}

export function showSuccessMessage<T>(snackBar: MatSnackBar): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) => source.pipe(
    tap(() => SharedConstants.showSuccessUpdate(snackBar))
  );
}

export function catchErrors<T>(snackBar: MatSnackBar): (source: Observable<T>) => Observable<T> {
  return (source: Observable<T>) => source.pipe(
    catchError((e) => {
      console.error(e);
      snackBar.open(SharedConstants.messages.operationFailed, undefined, {duration: 8000, panelClass: 'snack-error'});
      return NEVER;
    })
  );
}

export function remapErrors<T>() {
  // In Supabase v2, errors are handled differently - just pass through
  return (source: Observable<any>) => source;
}

export function throwIfSupabaseError<T>() {
  return (source: Observable<any>) => source.pipe(
    map((response: any) => {
      const responseError = (response as {error?: unknown} | null | undefined)?.error;
      if (responseError) {
        throw responseError;
      }
      return response as T;
    })
  );
}

export function throwIfSupabaseErrorWhen<T>(enabled: boolean): MonoTypeOperatorFunction<T> {
  return enabled
    ? (source: Observable<T>) => source.pipe(throwIfSupabaseError<T>())
    : (source: Observable<T>) => source;
}
