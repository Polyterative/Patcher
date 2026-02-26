import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MonoTypeOperatorFunction,
  NEVER,
  Observable,
  Subject
} from 'rxjs';
import {
  catchError,
  tap
} from 'rxjs/operators';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  GlobalCacheConfig,
  LocalStorageStrategy
} from 'ts-cacheable';


GlobalCacheConfig.storageStrategy = LocalStorageStrategy;

export const defaultCacheTime = 5 * 60 * 1000;
export const longCacheTime = defaultCacheTime * 10;
export const smallCacheTime = defaultCacheTime / 5;

export type CachedEntity =
  'comments'
  | 'modules'
  | 'manufacturers'
  | 'currentUserModules'
  | 'moduleWithId'
  | 'patchConnections'
  | 'patchModuleInstances'
  | 'patches'
  | 'currentUserComments'
  | 'rackWithId'
  | 'racksMinimal'
  | 'userModuleTags'
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
      SharedConstants.errorHandlerOperation(snackBar);
      return NEVER;
    })
  );
}

export function remapErrors<T>() {
  // In Supabase v2, errors are handled differently - just pass through
  return (source: Observable<any>) => source;
}