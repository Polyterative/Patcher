import type { NormalizedStoreListingSnapshot } from '../../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';
import type { ApprovedPriceHubStoreConfig } from '../store-configs.ts';
import type { PriceHubFetch, PriceHubFetchResponse, PriceHubFetchInit } from './types.ts';

export const DEFAULT_CATALOG_MAX_PAGES = 100;
export const DEFAULT_CATALOG_PER_PAGE = 100;
export const DEFAULT_SHOPIFY_CATALOG_PER_PAGE = 250;
export const DEFAULT_SITEMAP_MAX_PRODUCTS = 100;

export const PRICE_HUB_CRAWLER_HEADERS = {
  accept: 'application/json, text/html, application/xml, text/xml;q=0.9, */*;q=0.8',
  'user-agent': 'Mozilla/5.0',
} as const;

export const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

const responseAbortControllers = new WeakMap<PriceHubFetchResponse, AbortController>();

export async function fetchWithTimeout<T>(
  fetchPromise: Promise<T>,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
  context = 'Price Hub fetch',
  onTimeout?: (error: Error) => void,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetchPromise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          const error = new Error(`${context} timed out after ${timeoutMs}ms.`);
          onTimeout?.(error);
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function fetchResponseWithTimeout(
  fetchFn: PriceHubFetch,
  url: string,
  init: PriceHubFetchInit | undefined,
  timeoutMs: number,
  context: string,
): Promise<PriceHubFetchResponse> {
  const controller = new AbortController();
  const response = await fetchWithTimeout(
    fetchFn(url, {
      ...init,
      signal: init?.signal ? anyAbortSignal([init.signal, controller.signal]) : controller.signal,
      timeoutMs,
    }),
    timeoutMs,
    context,
    (error) => controller.abort(error),
  );
  responseAbortControllers.set(response, controller);
  return response;
}

export function abortResponse(response: PriceHubFetchResponse, reason: Error): void {
  responseAbortControllers.get(response)?.abort(reason);
}

function anyAbortSignal(signals: readonly AbortSignal[]): AbortSignal {
  if ('any' in AbortSignal && typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }

  const controller = new AbortController();
  const abort = (signal: AbortSignal) => controller.abort(signal.reason);
  for (const signal of signals) {
    if (signal.aborted) {
      abort(signal);
      break;
    }
    signal.addEventListener('abort', () => abort(signal), { once: true });
  }
  return controller.signal;
}

export function addStoreConfiguredMetadata(
  product: NormalizedStoreListingSnapshot,
  store: ApprovedPriceHubStoreConfig,
): NormalizedStoreListingSnapshot {
  if (!store.productBrandHint) {
    return product;
  }

  return {
    ...product,
    rawMeta: {
      ...product.rawMeta,
      brand: store.productBrandHint,
    },
  };
}

export async function readJsonResponse(response: PriceHubFetchResponse, context: string): Promise<unknown> {
  if (response.json) {
    return response.json();
  }

  const body = await readTextResponse(response, context);
  return JSON.parse(body) as unknown;
}

export async function readTextResponse(response: PriceHubFetchResponse, context: string): Promise<string> {
  if (!response.text) {
    throw new Error(`${context} did not expose text.`);
  }

  return response.text();
}

export function readPositiveInteger(value: number | undefined, fallback: number, fieldName: string): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return value;
}

export function readOptionalPositiveInteger(value: number | undefined, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return value;
}


export function uniqueStrings(values: readonly (string | null)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => value !== null))).sort();
}

export function readStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function readStringNumberOrNull(value: unknown): string | number | null {
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

export function readNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readBooleanOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
