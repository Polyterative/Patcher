import { StorageUrls } from 'src/app/features/backend/DatabaseStrings';

export const MODULE_PANELS_BASE_URL = StorageUrls.modulePanels;
export const JSONLD_SCRIPT_ID = 'module-jsonld';

// Last audited: 2026-05-16. Re-check all URLs periodically (sites redesign).
// Verified: Google, YouTube, Modwiggler, Lines, Elektronauts, Modulargrid,
//           VCV Library, Wigglehunt, Thomann (geo-redirects to regional), Signalsounds,
//           Exploding Shed, Elevator Sound, Perfect Circuit, Milk Audio, New Groove,
//           Escape From Noise, Machineroom, Control, Patchwerks, Found Sound, Synthshop,
//           Post Modular, Rubadub, Modular Square, MIDI Amsterdam, Modularsynthesizers.nl,
//           Triangle Core Rocks, House of Sound.
// Schneidersladen: migrated to Shopware 6 — use `?search=` instead of `?sSearch=`.

export interface SearchLink {
  url: (name: string, manufacturer?: string) => string;
  label: string;
  icon: string;
  tooltip: string;
  kind: 'community' | 'retailer';
  storeSlugs?: readonly string[];
  storeIds?: readonly number[];
}

function buildSearchUrl(baseUrl: string, params: Record<string, string>): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

export const MODULE_SEARCH_LINKS: SearchLink[] = [
  {
    url: (name: string, manufacturer: string) => buildSearchUrl('https://www.google.com/search', {
      q: `${ name } by ${ manufacturer }`
    }),
    label: 'Google',
    icon: 'search',
    tooltip: 'Search on Google',
    kind: 'community'
  },
  {
    url: (name: string, manufacturer: string) => buildSearchUrl('https://www.youtube.com/results', {
      search_query: `${ name } ${ manufacturer }`
    }),
    label: 'YouTube',
    icon: 'video_library',
    tooltip: 'Search on YouTube',
    kind: 'community'
  },
  {
    url: (name: string) => buildSearchUrl('https://www.modwiggler.com/forum/search.php', {
      keywords: name
    }),
    label: 'Modwiggler',
    icon: 'forum',
    tooltip: 'Search on Modwiggler',
    kind: 'community'
  },
  {
    url: (name: string) => buildSearchUrl('https://llllllll.co/search', {
      q: name
    }),
    label: 'Lines',
    icon: 'forum',
    tooltip: 'Search on Lines',
    kind: 'community'
  },
  {
    url: (name: string) => buildSearchUrl('https://www.elektronauts.com/search', {
      q: name
    }),
    label: 'Elektronauts',
    icon: 'forum',
    tooltip: 'Search on Elektronauts',
    kind: 'community'
  },
  {
    url: (name: string) => buildSearchUrl('https://modulargrid.net/e/modules/browser', {
      SearchName: name
    }),
    label: 'Modulargrid',
    icon: 'power',
    tooltip: 'Search on Modulargrid',
    kind: 'community'
  },
  {
    url: (name: string) => buildSearchUrl('https://library.vcvrack.com/', {
      query: name
    }),
    label: 'VCV Library',
    icon: 'power',
    tooltip: 'Search on VCV Library',
    kind: 'community'
  },
  {
    url: (name: string) => buildSearchUrl('https://wigglehunt.com/', {
      query: name
    }),
    label: 'Wigglehunt',
    icon: 'attach_money',
    tooltip: 'Search on Wigglehunt',
    kind: 'community'
  },
  {
    url: (name: string) => buildSearchUrl('https://www.thomann.de/intl/search_dir.html', {
      sw: name
    }),
    label: 'Thomann 🇩🇪',
    icon: 'store',
    tooltip: 'Search on Thomann',
    kind: 'retailer',
    storeSlugs: ['thomann']
  },
  {
    url: (name: string) => buildSearchUrl('https://schneidersladen.de/en/search', {
      search: name
    }),
    label: 'Schneidersladen 🇩🇪',
    icon: 'store',
    tooltip: 'Search on Schneidersladen',
    kind: 'retailer',
    storeSlugs: ['schneidersladen']
  },
  {
    url: (name: string) => buildSearchUrl('https://www.signalsounds.com/search.php', {
      search_query: name
    }),
    label: 'Signal Sounds UK 🇬🇧',
    icon: 'store',
    tooltip: 'Search on Signal Sounds UK',
    kind: 'retailer',
    storeSlugs: ['signal-sounds-uk', 'signalsounds', 'signal-sounds']
  },
  {
    url: (name: string) => buildSearchUrl('https://signalsounds.eu/search.php', {
      search_query: name
    }),
    label: 'Signal Sounds EU 🇪🇺',
    icon: 'store',
    tooltip: 'Search on Signal Sounds EU',
    kind: 'retailer',
    storeSlugs: ['signal-sounds-eu', 'signalsounds-eu']
  },
  {
    url: (name: string) => buildSearchUrl('https://www.exploding-shed.com/search', {
      search: name
    }),
    label: 'Exploding Shed 🇩🇪',
    icon: 'store',
    tooltip: 'Search on Exploding Shed',
    kind: 'retailer',
    storeSlugs: ['exploding-shed']
  },
  {
    url: (name: string) => buildSearchUrl('https://www.elevatorsound.com/', {
      s: name,
      post_type: 'product'
    }),
    label: 'Elevator Sound 🇬🇧',
    icon: 'store',
    tooltip: 'Search on Elevator Sound',
    kind: 'retailer',
    storeSlugs: ['elevator-sound']
  },
  {
    url: (name: string) => buildSearchUrl('https://www.perfectcircuit.com/catalogsearch/result/', {
      q: name
    }),
    label: 'Perfect Circuit 🇺🇸',
    icon: 'store',
    tooltip: 'Search on Perfect Circuit',
    kind: 'retailer',
    storeSlugs: ['perfect-circuit', 'perfectcircuit']
  },
  {
    url: (name: string) => buildSearchUrl('https://www.milkaudiostore.com/it/search', {
      term: name
    }),
    label: 'Milk Audio Store 🇮🇹',
    icon: 'store',
    tooltip: 'Search on Milk Audio Store',
    kind: 'retailer',
    storeSlugs: ['milk-audio-store', 'milk-audio']
  },
  {
    url: (name: string) => buildSearchUrl('https://www.newgroove.it/', {
      product_cat: '0',
      s: name,
      post_type: 'product',
      et_search: 'true'
    }),
    label: 'New Groove 🇮🇹',
    icon: 'store',
    tooltip: 'Search on New Groove',
    kind: 'retailer',
    storeSlugs: ['new-groove']
  },
  {
    url: (name: string) => buildSearchUrl('https://escapefromnoise.com/search/', {
      q: name,
      lang: 'en'
    }),
    label: 'Escape From Noise 🇸🇪',
    icon: 'store',
    tooltip: 'Search on Escape From Noise',
    kind: 'retailer',
    storeSlugs: ['escape-from-noise']
  },
  {
    url: (name: string) => buildSearchUrl('https://machineroom.com.ua/', {
      s: name
    }),
    label: 'Machineroom 🇺🇦',
    icon: 'store',
    tooltip: 'Search on Machineroom',
    kind: 'retailer',
    storeSlugs: ['machineroom', 'machine-room']
  },
  {
    url: (name) => buildSearchUrl('https://www.ctrl-mod.com/search', {
      type: 'product',
      q: name
    }),
    label: 'Control 🇺🇸',
    icon: 'store',
    tooltip: 'Search on Control',
    kind: 'retailer',
    storeSlugs: ['control']
  },
  {
    url: (name) => buildSearchUrl('https://www.patchwerks.com/search', {
      q: name
    }),
    label: 'Patchwerks 🇺🇸',
    icon: 'store',
    tooltip: 'Search on Patchwerks',
    kind: 'retailer',
    storeSlugs: ['patchwerks']
  },
  {
    url: (name) => buildSearchUrl('https://foundsound.com.au/search', {
      q: name
    }),
    label: 'Found Sound 🇦🇺',
    icon: 'store',
    tooltip: 'Search on Found Sound',
    kind: 'retailer',
    storeSlugs: ['found-sound']
  },
  {
    url: (name) => buildSearchUrl('https://synthshop.no/search', {
      q: name
    }),
    label: 'Synthshop 🇳🇴',
    icon: 'store',
    tooltip: 'Search on Synthshop',
    kind: 'retailer',
    storeSlugs: ['synthshop']
  },
  {
    url: (name) => buildSearchUrl('https://postmodular.co.uk/', {
      s: name,
      post_type: 'product'
    }),
    label: 'Post Modular 🇬🇧',
    icon: 'store',
    tooltip: 'Search on Post Modular',
    kind: 'retailer',
    storeSlugs: ['postmodular', 'post-modular']
  },
  {
    url: (name) => buildSearchUrl('https://rubadub.co.uk/search', {
      type: 'product',
      q: name
    }),
    label: 'Rubadub 🇬🇧',
    icon: 'store',
    tooltip: 'Search on Rubadub',
    kind: 'retailer',
    storeSlugs: ['rubadub']
  },
  {
    url: (name) => buildSearchUrl('https://www.modularsquare.com/search', {
      controller: 'search',
      s: name
    }),
    label: 'Modular Square 🇫🇷',
    icon: 'store',
    tooltip: 'Search on Modular Square',
    kind: 'retailer',
    storeSlugs: ['modular-square', 'modularsquare']
  },
  {
    url: (name) => buildSearchUrl('https://www.midiamsterdam.nl/search', {
      type: 'product',
      q: name
    }),
    label: 'MIDI Amsterdam 🇳🇱',
    icon: 'store',
    tooltip: 'Search on MIDI Amsterdam',
    kind: 'retailer',
    storeSlugs: ['midi-amsterdam', 'midiamsterdam']
  },
  {
    url: (name) => buildSearchUrl('https://www.modularsynthesizers.nl/search/', {
      q: name
    }),
    label: 'Modularsynthesizers.nl 🇳🇱',
    icon: 'store',
    tooltip: 'Search on Modularsynthesizers.nl',
    kind: 'retailer',
    storeSlugs: ['modularsynthesizers', 'modularsynthesizers-nl']
  },
  {
    url: (name) => buildSearchUrl('https://trianglecore.rocks/store/eurorack', {
      search: name
    }),
    label: 'Triangle Core Rocks 🇩🇪',
    icon: 'store',
    tooltip: 'Search on Triangle Core Rocks',
    kind: 'retailer',
    storeSlugs: ['triangle-core-rocks', 'trianglecore']
  },
  {
    url: (name) => buildSearchUrl('https://www.houseofsound.ch/search', {
      sSearch: name
    }),
    label: 'House of Sound 🇨🇭',
    icon: 'store',
    tooltip: 'Search on House of Sound',
    kind: 'retailer',
    storeSlugs: ['house-of-sound', 'houseofsound']
  },
];
