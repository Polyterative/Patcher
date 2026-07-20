import {
  defer,
  Observable,
  of,
  throwError
} from 'rxjs';
import {
  catchError,
  map,
  mergeMap,
  retry
} from 'rxjs/operators';


export interface BrowserListResponse<TItem> {
  data?: TItem[] | null;
  count?: number | null;
  error?: unknown;
}

export interface BrowserListResult<TItem> {
  data: TItem[];
  count: number;
}

export interface ListRecoveryOptions {
  beforeRetry?: () => void;
  onExhausted?: (error: unknown) => void;
}

export type BrowserListRecoveryOptions = ListRecoveryOptions;

export function recoverListRequest<T>(
  requestFactory: () => Observable<T>,
  fallback: T,
  logMessage: string,
  options: ListRecoveryOptions = {}
): Observable<T> {
  return defer(requestFactory).pipe(
    retry({
      count: 1,
      delay: () => {
        options.beforeRetry?.();
        return of(null);
      }
    }),
    catchError(error => {
      console.error(logMessage, error);
      options.onExhausted?.(error);
      return of(fallback);
    })
  );
}

export function recoverBrowserListRequest<TItem>(
  requestFactory: () => Observable<BrowserListResponse<TItem>>,
  fallback: BrowserListResult<TItem>,
  logMessage: string,
  options: BrowserListRecoveryOptions = {}
): Observable<BrowserListResult<TItem>> {
  return recoverListRequest(
    () => requestFactory().pipe(
      mergeMap(response => response.error
        ? throwError(() => response.error)
        : of(response)
      ),
      map(response => ({
        data: response.data ?? [],
        count: response.count ?? fallback.count
      }))
    ),
    fallback,
    logMessage,
    options
  );
}
