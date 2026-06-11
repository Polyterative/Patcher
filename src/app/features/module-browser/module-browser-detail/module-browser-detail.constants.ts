import { StorageUrls } from 'src/app/features/backend/DatabaseStrings';

export const MODULE_PANELS_BASE_URL = StorageUrls.modulePanels;
export const JSONLD_SCRIPT_ID = 'module-jsonld';

// Last audited: 2026-05-16. Re-check all URLs periodically (sites redesign).
// Verified: Google, YouTube, Modwiggler, Lines, Elektronauts, Modulargrid,
//           VCV Library, Wigglehunt, Thomann (geo-redirects to regional), Signalsounds,
//           Exploding Shed, Elevatorsound, Perfect Circuit, Milk Audio, New Groove,
//           Escape From Noise, Machineroom, Control, Patchwerks, Found Sound, Synthshop.
// Schneidersladen: migrated to Shopware 6 — use `?search=` instead of `?sSearch=`.

export interface SearchLink {
  url: (name: string, manufacturer?: string) => string;
  label: string;
  icon: string;
  tooltip: string;
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
    tooltip: 'Search on Google'
  },
  {
    url: (name: string, manufacturer: string) => buildSearchUrl('https://www.youtube.com/results', {
      search_query: `${ name } ${ manufacturer }`
    }),
    label: 'YouTube',
    icon: 'video_library',
    tooltip: 'Search on YouTube'
  },
  {
    url: (name: string) => buildSearchUrl('https://www.modwiggler.com/forum/search.php', {
      keywords: name
    }),
    label: 'Modwiggler',
    icon: 'forum',
    tooltip: 'Search on Modwiggler'
  },
  {
    url: (name: string) => buildSearchUrl('https://llllllll.co/search', {
      q: name
    }),
    label: 'Lines',
    icon: 'forum',
    tooltip: 'Search on Lines'
  },
  {
    url: (name: string) => buildSearchUrl('https://www.elektronauts.com/search', {
      q: name
    }),
    label: 'Elektronauts',
    icon: 'forum',
    tooltip: 'Search on Elektronauts'
  },
  {
    url: (name: string) => buildSearchUrl('https://modulargrid.net/e/modules/browser', {
      SearchName: name
    }),
    label: 'Modulargrid',
    icon: 'power',
    tooltip: 'Search on Modulargrid'
  },
  {
    url: (name: string) => buildSearchUrl('https://library.vcvrack.com/', {
      query: name
    }),
    label: 'VCV Library',
    icon: 'power',
    tooltip: 'Search on VCV Library'
  },
  {
    url: (name: string) => buildSearchUrl('https://wigglehunt.com/', {
      query: name
    }),
    label: 'Wigglehunt',
    icon: 'attach_money',
    tooltip: 'Search on Wigglehunt'
  },
  {
    url: (name: string) => buildSearchUrl('https://www.thomann.de/intl/search_dir.html', {
      sw: name
    }),
    label: 'Thomann 🇩🇪',
    icon: 'store',
    tooltip: 'Search on Thomann'
  },
  {
    url: (name: string) => buildSearchUrl('https://schneidersladen.de/en/search', {
      search: name
    }),
    label: 'Schneidersladen 🇩🇪',
    icon: 'store',
    tooltip: 'Search on Schneidersladen'
  },
  {
    url: (name: string) => buildSearchUrl('https://www.signalsounds.com/search.php', {
      search_query: name
    }),
    label: 'Signalsounds 🇬🇧',
    icon: 'store',
    tooltip: 'Search on Signalsounds'
  },
  {
    url: (name: string) => buildSearchUrl('https://www.exploding-shed.com/search', {
      search: name
    }),
    label: 'Exploding Shed 🇩🇪',
    icon: 'store',
    tooltip: 'Search on Exploding Shed'
  },
  {
    url: (name: string) => buildSearchUrl('https://eu.elevatorsound.com/shop/', {
      _sf_s: name
    }),
    label: 'Elevatorsound 🇬🇧',
    icon: 'store',
    tooltip: 'Search on Elevatorsound'
  },
  {
    url: (name: string) => buildSearchUrl('https://www.perfectcircuit.com/catalogsearch/result/', {
      q: name
    }),
    label: 'Perfect Circuit 🇺🇸',
    icon: 'store',
    tooltip: 'Search on Perfect Circuit'
  },
  {
    url: (name: string) => buildSearchUrl('https://www.milkaudiostore.com/it/search', {
      term: name
    }),
    label: 'Milk Audio Store 🇮🇹',
    icon: 'store',
    tooltip: 'Search on Milk Audio Store'
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
    tooltip: 'Search on New Groove'
  },
  {
    url: (name: string) => buildSearchUrl('https://escapefromnoise.com/search/', {
      q: name,
      lang: 'en'
    }),
    label: 'Escape From Noise 🇸🇪',
    icon: 'store',
    tooltip: 'Search on Escape From Noise'
  },
  {
    url: (name: string) => buildSearchUrl('https://machineroom.com.ua/', {
      s: name
    }),
    label: 'Machineroom 🇺🇦',
    icon: 'store',
    tooltip: 'Search on Machineroom'
  },
  {
    url: (name) => buildSearchUrl('https://www.ctrl-mod.com/search', {
      type: 'product',
      q: name
    }),
    label: 'Control 🇺🇸',
    icon: 'store',
    tooltip: 'Search on Control'
  },
  {
    url: (name) => buildSearchUrl('https://www.patchwerks.com/search', {
      q: name
    }),
    label: 'Patchwerks 🇺🇸',
    icon: 'store',
    tooltip: 'Search on Patchwerks'
  },
  {
    url: (name) => buildSearchUrl('https://foundsound.com.au/search', {
      q: name
    }),
    label: 'Found Sound 🇦🇺',
    icon: 'store',
    tooltip: 'Search on Found Sound'
  },
  {
    url: (name) => buildSearchUrl('https://synthshop.no/search', {
      q: name
    }),
    label: 'Synthshop 🇳🇴',
    icon: 'store',
    tooltip: 'Search on Synthshop'
  },
];
