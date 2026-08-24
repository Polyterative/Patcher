import type { ShopifyVariantTitlePreference } from '../../supabase/functions/_shared/price-hub/shopify-product-json.ts';

export type ApprovedPriceHubStoreSlug =
  | '1010-music'
  | 'after-later-audio'
  | 'animato-audio'
  | 'audio-damage'
  | 'big-city-music'
  | 'bugbrand'
  | 'busy-circuits'
  | 'cicada-sound'
  | 'clockface-modular'
  | 'control'
  | 'control-voltage'
  | 'detroit-modular'
  | 'dreadbox'
  | 'elevator-sound'
  | 'escape-from-noise'
  | 'exploding-shed'
  | 'found-sound'
  | 'frap-tools'
  | 'instruo'
  | 'intellijel'
  | 'machineroom'
  | 'manhattan-analog'
  | 'martin-pas'
  | 'midwest-modular'
  | 'milk-audio-store'
  | 'michigan-synth-works'
  | 'moog-audio'
  | 'nano-modules'
  | 'nightlife-electronics'
  | 'new-groove'
  | 'noisebug'
  | 'patch-point'
  | 'postmodular'
  | 'pusherman-productions'
  | 'robotspeak'
  | 'rubadub'
  | 'schlappi-engineering'
  | 'signal-sounds-uk'
  | 'signal-sounds-eu'
  | 'schneidersladen'
  | 'soma-laboratory'
  | 'soundium'
  | 'steady-state-fate'
  | 'synthesis-technology'
  | 'synthshop'
  | 'technosynth'
  | 'tesseract-modular'
  | 'thonk'
  | 'toppobrillo'
  | 'turnlab'
  | 'whimsical-raps'
  | 'wmdevices'
  | 'zlob-modular';
export type PriceHubStoreAdapter = 'woocommerce_store_api' | 'shopify_product_json' | 'bigcommerce_metadata' | 'shopware_metadata' | 'custom';

export interface PriceHubMatchScoreThresholds {
  strongCandidate: number;
  reviewCandidate: number;
}

export interface PriceHubStoreMatchConfig {
  scoreThresholds?: Partial<PriceHubMatchScoreThresholds>;
  noiseTerms?: readonly string[];
}

export interface ResolvedPriceHubStoreMatchConfig {
  scoreThresholds: PriceHubMatchScoreThresholds;
  noiseTerms: readonly string[];
}

export interface ApprovedPriceHubStoreConfig {
  slug: ApprovedPriceHubStoreSlug;
  name: string;
  baseUrl: string;
  adapter: PriceHubStoreAdapter;
  catalogPath?: string;
  currencyHint?: string;
  ignoredMatchNoiseTags?: readonly string[];
  productUrlPathExcludes?: readonly string[];
  productUrlPathIncludes?: readonly string[];
  productBrandHint?: string;
  shopifyVariantTitlePreference?: ShopifyVariantTitlePreference;
  matchConfig?: PriceHubStoreMatchConfig;
}

export const DEFAULT_PRICE_HUB_MATCH_CONFIG: ResolvedPriceHubStoreMatchConfig = {
  scoreThresholds: {
    strongCandidate: 0.86,
    reviewCandidate: 0.72,
  },
  noiseTerms: [
    'accessory',
    'accessories',
    'b-stock',
    'b stock',
    'bourns',
    'bundle',
    'case',
    'cable',
    'cables',
    'cap',
    'consignment',
    'cover',
    'covers',
    'deposit',
    'embroidered',
    'ex-demo',
    'ex demo',
    'faceplate',
    'frontpanel',
    'guide',
    'hat',
    'hoodie',
    'kit',
    'kitbag',
    'kitbags',
    'manual',
    'memory card',
    'no-longer-available',
    'no longer available',
    'occasione',
    'open-box',
    'open box',
    'opening soon',
    'panel',
    'panel set',
    'parts',
    'pcb',
    'pcb panel',
    'pedal',
    'potentiometer',
    'potentiometers',
    'pre-order',
    'pre order',
    'preorder',
    'prenotazione',
    'preordine',
    'pre-owned',
    'pre owned',
    'power adapter',
    'refurbished',
    'replacement parts',
    'special-order',
    'special order',
    'spares',
    'stackcable',
    'sticker',
    'stickers',
    'slide pot',
    'slider',
    'slipmat',
    't-shirt',
    't shirt',
    'tee',
    'used',
    'usato',
  ],
};

export const APPROVED_PRICE_HUB_STORES: readonly ApprovedPriceHubStoreConfig[] = [
  {
    slug: '1010-music',
    name: '1010 Music',
    baseUrl: 'https://1010music.com/',
    adapter: 'woocommerce_store_api',
    productBrandHint: '1010 Music',
  },
  {
    slug: 'after-later-audio',
    name: 'After Later Audio',
    baseUrl: 'https://afterlateraudio.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
  },
  {
    slug: 'animato-audio',
    name: 'Animato Audio',
    baseUrl: 'https://animatoaudio.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'HKD',
  },
  {
    slug: 'audio-damage',
    name: 'Audio Damage',
    baseUrl: 'https://www.audiodamage.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
    productBrandHint: 'Audio Damage',
  },
  {
    slug: 'big-city-music',
    name: 'Big City Music',
    baseUrl: 'https://bigcitymusic.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
  },
  {
    slug: 'bugbrand',
    name: 'BugBrand',
    baseUrl: 'https://www.bugbrand.co.uk/',
    adapter: 'woocommerce_store_api',
    productBrandHint: 'BugBrand',
  },
  {
    slug: 'busy-circuits',
    name: 'ALM / Busy Circuits',
    baseUrl: 'https://busycircuits.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'GBP',
    productBrandHint: 'ALM Busy Circuits',
  },
  {
    slug: 'cicada-sound',
    name: 'Cicada Sound',
    baseUrl: 'https://cicadasound.ca/',
    adapter: 'shopify_product_json',
    currencyHint: 'CAD',
  },
  {
    slug: 'clockface-modular',
    name: 'Clockface Modular',
    baseUrl: 'https://clockfacemodular.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'JPY',
  },
  {
    slug: 'control',
    name: 'Control',
    baseUrl: 'https://www.ctrl-mod.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
  },
  {
    slug: 'control-voltage',
    name: 'Control Voltage',
    baseUrl: 'https://www.controlvoltage.net/',
    adapter: 'custom',
    catalogPath: '/modular/',
    currencyHint: 'USD',
    productUrlPathIncludes: ['.html'],
    productUrlPathExcludes: ['-used.html'],
  },
  {
    slug: 'detroit-modular',
    name: 'Detroit Modular',
    baseUrl: 'https://www.detroitmodular.com/',
    adapter: 'shopify_product_json',
    catalogPath: '/collections/eurorack-modules/products.json',
    currencyHint: 'USD',
  },
  {
    slug: 'dreadbox',
    name: 'Dreadbox',
    baseUrl: 'https://www.dreadbox-fx.com/',
    adapter: 'woocommerce_store_api',
    productBrandHint: 'Dreadbox',
  },
  {
    slug: 'elevator-sound',
    name: 'Elevator Sound',
    baseUrl: 'https://www.elevatorsound.com/',
    adapter: 'woocommerce_store_api',
  },
  {
    slug: 'escape-from-noise',
    name: 'Escape From Noise',
    baseUrl: 'https://escapefromnoise.com/',
    adapter: 'custom',
    catalogPath: '/sitemap.xml',
    currencyHint: 'EUR',
    productUrlPathIncludes: ['/en/modular/'],
    productUrlPathExcludes: ['/used/'],
  },
  {
    slug: 'exploding-shed',
    name: 'Exploding Shed',
    baseUrl: 'https://www.exploding-shed.com/',
    adapter: 'custom',
    catalogPath: '/sitemap.xml',
    currencyHint: 'EUR',
    productUrlPathExcludes: [
      '/manuals-tutorials/',
      '/navigation/',
      '/information/',
      '/about-us/',
      '/new-products/',
    ],
  },
  {
    slug: 'found-sound',
    name: 'Found Sound',
    baseUrl: 'https://foundsound.com.au/',
    adapter: 'shopify_product_json',
    catalogPath: '/collections/eurorack/products.json',
    currencyHint: 'AUD',
    ignoredMatchNoiseTags: ['preorder'],
  },
  {
    slug: 'frap-tools',
    name: 'Frap Tools',
    baseUrl: 'https://www.fraptools.com/',
    adapter: 'woocommerce_store_api',
    productBrandHint: 'Frap Tools',
  },
  {
    slug: 'instruo',
    name: 'Instruo',
    baseUrl: 'https://www.instruomodular.com/',
    adapter: 'woocommerce_store_api',
    productBrandHint: 'Instruo',
  },
  {
    slug: 'intellijel',
    name: 'Intellijel',
    baseUrl: 'https://intellijel.com/',
    adapter: 'woocommerce_store_api',
    productBrandHint: 'Intellijel',
  },
  {
    slug: 'machineroom',
    name: 'Machineroom',
    baseUrl: 'https://machineroom.com.ua/',
    adapter: 'custom',
    catalogPath: '/sitemap_index.xml',
    currencyHint: 'EUR',
    productUrlPathIncludes: ['/product/'],
  },
  {
    slug: 'manhattan-analog',
    name: 'Manhattan Analog',
    baseUrl: 'https://manhattananalog.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
    productBrandHint: 'Manhattan Analog',
  },
  {
    slug: 'martin-pas',
    name: 'Martin Pas',
    baseUrl: 'https://www.martinpas.com/',
    adapter: 'custom',
    catalogPath: '/categories/modular-systems',
    currencyHint: 'EUR',
    productUrlPathIncludes: ['/products/'],
  },
  {
    slug: 'midwest-modular',
    name: 'Midwest Modular',
    baseUrl: 'https://midwestmodular.com/',
    adapter: 'bigcommerce_metadata',
  },
  {
    slug: 'milk-audio-store',
    name: 'Milk Audio Store',
    baseUrl: 'https://www.milkaudiostore.com/',
    adapter: 'custom',
    catalogPath: '/sitemaps/it/product-sitemap_it.xml',
    currencyHint: 'EUR',
    productUrlPathIncludes: ['/it/shop/'],
    productUrlPathExcludes: ['/usato/', '/occasioni/', '-used/'],
  },
  {
    slug: 'michigan-synth-works',
    name: 'Michigan Synth Works',
    baseUrl: 'https://michigansynthworks.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
    productBrandHint: 'Michigan Synth Works',
  },
  {
    slug: 'moog-audio',
    name: 'Moog Audio',
    baseUrl: 'https://moogaudio.com/',
    adapter: 'shopify_product_json',
    catalogPath: '/collections/modules/products.json',
    currencyHint: 'CAD',
  },
  {
    slug: 'nano-modules',
    name: 'Nano Modules',
    baseUrl: 'https://nano-modules.com/',
    adapter: 'woocommerce_store_api',
    productBrandHint: 'Nano Modules',
  },
  {
    slug: 'nightlife-electronics',
    name: 'Nightlife Electronics',
    baseUrl: 'https://nightlife-electronics.com/',
    adapter: 'shopify_product_json',
    catalogPath: '/collections/modular/products.json',
    currencyHint: 'CAD',
  },
  {
    slug: 'new-groove',
    name: 'New Groove',
    baseUrl: 'https://newgroove.it/',
    adapter: 'woocommerce_store_api',
  },
  {
    slug: 'noisebug',
    name: 'Noisebug',
    baseUrl: 'https://www.noisebug.net/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
  },
  {
    slug: 'patch-point',
    name: 'Patch Point',
    baseUrl: 'https://patch-point.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'EUR',
  },
  {
    slug: 'postmodular',
    name: 'Post Modular',
    baseUrl: 'https://postmodular.co.uk/',
    adapter: 'woocommerce_store_api',
  },
  {
    slug: 'pusherman-productions',
    name: 'Pusherman Productions',
    baseUrl: 'https://pushermanproductions.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'GBP',
    shopifyVariantTitlePreference: {
      prefer: ['built module', 'assembled', 'complete'],
      avoid: ['kit', 'pcb', 'panel only', 'pcb/panel', 'panel set'],
    },
  },
  {
    slug: 'robotspeak',
    name: 'RobotSpeak',
    baseUrl: 'https://robotspeak.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
  },
  {
    slug: 'rubadub',
    name: 'Rubadub',
    baseUrl: 'https://rubadub.co.uk/',
    adapter: 'shopify_product_json',
    catalogPath: '/collections/eurorack/products.json',
    currencyHint: 'GBP',
  },
  {
    slug: 'schlappi-engineering',
    name: 'Schlappi Engineering',
    baseUrl: 'https://schlappiengineering.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
    productBrandHint: 'Schlappi Engineering',
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
  {
    slug: 'soma-laboratory',
    name: 'SOMA Laboratory',
    baseUrl: 'https://somasynths.com/',
    adapter: 'woocommerce_store_api',
    productBrandHint: 'SOMA Laboratory',
  },
  {
    slug: 'soundium',
    name: 'Soundium',
    baseUrl: 'https://soundium.lt/',
    adapter: 'shopify_product_json',
    currencyHint: 'EUR',
  },
  {
    slug: 'steady-state-fate',
    name: 'Steady State Fate',
    baseUrl: 'https://www.steadystatefate.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
    productBrandHint: 'Steady State Fate',
  },
  {
    slug: 'synthesis-technology',
    name: 'Synthesis Technology',
    baseUrl: 'https://www.synthesizers.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
    productBrandHint: 'Synthesis Technology',
  },
  {
    slug: 'synthshop',
    name: 'Synthshop',
    baseUrl: 'https://synthshop.no/',
    adapter: 'shopify_product_json',
    currencyHint: 'NOK',
  },
  {
    slug: 'technosynth',
    name: 'TechnoSynth',
    baseUrl: 'https://technosynth.com/',
    adapter: 'woocommerce_store_api',
  },
  {
    slug: 'tesseract-modular',
    name: 'Tesseract Modular',
    baseUrl: 'https://www.tesseractmodular.com/',
    adapter: 'woocommerce_store_api',
    productBrandHint: 'Tesseract Modular',
  },
  {
    slug: 'thonk',
    name: 'Thonk',
    baseUrl: 'https://www.thonk.co.uk/',
    adapter: 'woocommerce_store_api',
  },
  {
    slug: 'toppobrillo',
    name: 'Toppobrillo',
    baseUrl: 'https://toppobrillo.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
    productBrandHint: 'Toppobrillo',
  },
  {
    slug: 'turnlab',
    name: 'Turnlab',
    baseUrl: 'https://www.turnlab.be/',
    adapter: 'custom',
    catalogPath: '/keys-synths/synths/modular-synths/eurorack/',
    currencyHint: 'EUR',
    productUrlPathIncludes: ['.html'],
  },
  {
    slug: 'whimsical-raps',
    name: 'Whimsical Raps',
    baseUrl: 'https://whimsicalraps.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
    productBrandHint: 'Whimsical Raps',
  },
  {
    slug: 'wmdevices',
    name: 'WMD',
    baseUrl: 'https://wmdevices.com/',
    adapter: 'shopify_product_json',
    currencyHint: 'USD',
  },
  {
    slug: 'zlob-modular',
    name: 'Zlob Modular',
    baseUrl: 'https://zlobmodular.com/',
    adapter: 'woocommerce_store_api',
    productBrandHint: 'Zlob Modular',
  },
];

export function readApprovedPriceHubStore(slug: string): ApprovedPriceHubStoreConfig {
  const store = APPROVED_PRICE_HUB_STORES.find((candidate) => candidate.slug === slug);
  if (!store) {
    throw new Error(`Unsupported Price Hub store "${slug}". Use ${APPROVED_PRICE_HUB_STORES.map((candidate) => candidate.slug).join(', ')}, or all.`);
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

export function readPriceHubStoreMatchConfig(
  storeOrConfig?: ApprovedPriceHubStoreConfig | PriceHubStoreMatchConfig | null,
): ResolvedPriceHubStoreMatchConfig {
  const matchConfig = storeOrConfig && 'matchConfig' in storeOrConfig
    ? storeOrConfig.matchConfig
    : storeOrConfig;

  return {
    scoreThresholds: {
      ...DEFAULT_PRICE_HUB_MATCH_CONFIG.scoreThresholds,
      ...(matchConfig?.scoreThresholds ?? {}),
    },
    noiseTerms: matchConfig?.noiseTerms ?? DEFAULT_PRICE_HUB_MATCH_CONFIG.noiseTerms,
  };
}

function assertHttpsBaseUrl(baseUrl: string): void {
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:') {
    throw new Error(`Approved Price Hub store "${baseUrl}" must use https.`);
  }
}
