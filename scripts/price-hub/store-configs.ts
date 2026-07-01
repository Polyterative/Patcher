export type ApprovedPriceHubStoreSlug =
  | 'elevator-sound'
  | 'new-groove'
  | 'signal-sounds-uk'
  | 'signal-sounds-eu'
  | 'schneidersladen';
export type PriceHubStoreAdapter = 'woocommerce_store_api' | 'bigcommerce_metadata' | 'shopware_metadata';

export interface ApprovedPriceHubStoreConfig {
  slug: ApprovedPriceHubStoreSlug;
  name: string;
  baseUrl: string;
  adapter: PriceHubStoreAdapter;
}

export const APPROVED_PRICE_HUB_STORES: readonly ApprovedPriceHubStoreConfig[] = [
  {
    slug: 'elevator-sound',
    name: 'Elevator Sound',
    baseUrl: 'https://www.elevatorsound.com/',
    adapter: 'woocommerce_store_api',
  },
  {
    slug: 'new-groove',
    name: 'New Groove',
    baseUrl: 'https://newgroove.it/',
    adapter: 'woocommerce_store_api',
  },
  {
    slug: 'signal-sounds-uk',
    name: 'Signal Sounds UK',
    baseUrl: 'https://www.signalsounds.com/',
    adapter: 'bigcommerce_metadata',
  },
  {
    slug: 'signal-sounds-eu',
    name: 'Signal Sounds EU',
    baseUrl: 'https://signalsounds.eu/',
    adapter: 'bigcommerce_metadata',
  },
  {
    slug: 'schneidersladen',
    name: 'SchneidersLaden',
    baseUrl: 'https://schneidersladen.de/en/',
    adapter: 'shopware_metadata',
  },
];

export function readApprovedPriceHubStore(slug: string): ApprovedPriceHubStoreConfig {
  const store = APPROVED_PRICE_HUB_STORES.find((candidate) => candidate.slug === slug);
  if (!store) {
    throw new Error(`Unsupported Price Hub store "${slug}". Use elevator-sound, new-groove, signal-sounds-uk, signal-sounds-eu, schneidersladen, or all.`);
  }

  assertHttpsBaseUrl(store.baseUrl);
  return store;
}

export function readApprovedPriceHubStores(storeSlug: string): ApprovedPriceHubStoreConfig[] {
  if (storeSlug === 'all') {
    return APPROVED_PRICE_HUB_STORES.map((store) => {
      assertHttpsBaseUrl(store.baseUrl);
      return store;
    });
  }

  return [readApprovedPriceHubStore(storeSlug)];
}

function assertHttpsBaseUrl(baseUrl: string): void {
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:') {
    throw new Error(`Approved Price Hub store "${baseUrl}" must use https.`);
  }
}
