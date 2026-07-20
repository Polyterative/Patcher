import type { NormalizedStoreListingSnapshot } from '../../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';
import type { ApprovedPriceHubStoreConfig } from '../store-configs.ts';

export interface PriceHubFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers?: Pick<Headers, 'get'>;
  body?: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>;
  arrayBuffer?(): Promise<ArrayBuffer>;
  json?(): Promise<unknown>;
  text?(): Promise<string>;
}

export interface PriceHubFetchInit extends RequestInit {
  timeoutMs?: number;
}

export type PriceHubFetch = (url: string, init?: PriceHubFetchInit) => Promise<PriceHubFetchResponse>;

export interface CrawlWooCommerceStoreCatalogOptions {
  fetchFn?: PriceHubFetch;
  fetchTimeoutMs?: number;
  maxPages?: number;
  maxProducts?: number;
  metadataConcurrency?: number;
  perPage?: number;
}

export interface CrawledWooCommerceStoreCatalog {
  store: ApprovedPriceHubStoreConfig;
  products: NormalizedStoreListingSnapshot[];
  pagesFetched: number;
  skippedProducts?: number;
  skippedProductUrls?: string[];
  skippedGoneProductUrls?: string[];
  totalProductUrls?: number;
  hitMaxProducts?: boolean;
  hitMaxPages?: boolean;
  hitMaxSitemapFiles?: boolean;
}

export type FetchBody = ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>;
