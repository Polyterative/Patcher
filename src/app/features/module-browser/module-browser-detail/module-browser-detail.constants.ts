export const MODULE_PANELS_BASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/module-panels/';
export const JSONLD_SCRIPT_ID = 'module-jsonld';

export interface SearchLink {
  url: (name: string, manufacturer?: string) => string;
  label: string;
  icon: string;
  tooltip: string;
}

export const MODULE_SEARCH_LINKS: SearchLink[] = [
  {
    url: (name: string, manufacturer: string) => `https://www.google.com/search?q=${ name } by ${ manufacturer }`,
    label: 'Google',
    icon: 'search',
    tooltip: 'Search on Google'
  },
  {
    url: (name: string, manufacturer: string) => `https://www.youtube.com/results?search_query=${ name }+${ manufacturer }`,
    label: 'YouTube',
    icon: 'video_library',
    tooltip: 'Search on YouTube'
  },
  {
    url: (name: string) => `https://www.modwiggler.com/forum/search.php?keywords=${ name }`,
    label: 'Modwiggler',
    icon: 'forum',
    tooltip: 'Search on Modwiggler'
  },
  {
    url: (name: string) => `https://llllllll.co/search?q=${ name }`,
    label: 'Lines',
    icon: 'forum',
    tooltip: 'Search on Lines'
  },
  {
    url: (name: string) => `https://www.elektronauts.com/search?q=${ name }`,
    label: 'Elektronauts',
    icon: 'forum',
    tooltip: 'Search on Elektronauts'
  },
  {
    url: (name: string) => `https://modulargrid.net/e/modules/browser?SearchName=${ name }`,
    label: 'Modulargrid',
    icon: 'power',
    tooltip: 'Search on Modulargrid'
  },
  {
    url: (name: string) => `https://library.vcvrack.com/?query=${ name }`,
    label: 'VCV Library',
    icon: 'power',
    tooltip: 'Search on VCV Library'
  },
  {
    url: (name: string) => `https://wigglehunt.com/?query=${ name }`,
    label: 'Wigglehunt',
    icon: 'attach_money',
    tooltip: 'Search on Modulargrid'
  },
  {
    url: (name: string) => `https://www.thomann.de/intl/search_dir.html?sw=${ name }`,
    label: 'Thomann 🇩🇪',
    icon: 'store',
    tooltip: 'Search on Thomann'
  },
  {
    url: (name: string) => `https://schneidersladen.de/en/search?sSearch=${ name }`,
    label: 'Schneidersladen 🇩🇪',
    icon: 'store',
    tooltip: 'Search on Schneidersladen'
  },
  {
    url: (name: string) => `https://www.signalsounds.com/search.php?search_query=${ name }`,
    label: 'Signalsounds 🇬🇧',
    icon: 'store',
    tooltip: 'Search on Signalsounds'
  },
  {
    url: (name: string) => `https://www.exploding-shed.com/search?search=${ name }`,
    label: 'Exploding Shed 🇩🇪',
    icon: 'store',
    tooltip: 'Search on Exploding Shed'
  },
  {
    url: (name: string) => `https://eu.elevatorsound.com/shop/?_sf_s=${ name }`,
    label: 'Elevatorsound 🇬🇧',
    icon: 'store',
    tooltip: 'Search on Elevatorsound'
  },
  {
    url: (name: string) => `https://www.perfectcircuit.com/catalogsearch/result/?q=${ name }`,
    label: 'Perfect Circuit 🇺🇸',
    icon: 'store',
    tooltip: 'Search on Perfect Circuit'
  },
  {
    url: (name: string) => `https://www.milkaudiostore.com/it/search?term=${ name }`,
    label: 'Milk Audio Store 🇮🇹',
    icon: 'store',
    tooltip: 'Search on Milk Audio Store'
  },
  {
    url: (name: string) => `https://www.newgroove.it/?product_cat=0&s=${ name }&post_type=product&et_search=true`,
    label: 'New Groove 🇮🇹',
    icon: 'store',
    tooltip: 'Search on New Groove'
  },
  {
    url: (name: string) => `https://escapefromnoise.com/search/?q=${ name }&lang=en`,
    label: 'Escape From Noise 🇸🇪',
    icon: 'store',
    tooltip: 'Search on Escape From Noise'
  },
  {
    url: (name: string) => `https://machineroom.com.ua/?s=${ name }`,
    label: 'Machineroom 🇺🇦',
    icon: 'store',
    tooltip: 'Search on Machineroom'
  },
  {
    url: (name) => `https://www.ctrl-mod.com/search?type=product&q=${ name }`,
    label: 'Control 🇺🇸',
    icon: 'store',
    tooltip: 'Search on Control'
  },
  {
    url: (name) => `https://www.patchwerks.com/search?q=${ name }`,
    label: 'Patchwerks 🇺🇸',
    icon: 'store',
    tooltip: 'Search on Patchwerks'
  },
  {
    url: (name) => `https://foundsound.com.au/search?q=${ name }`,
    label: 'Found Sound 🇦🇺',
    icon: 'store',
    tooltip: 'Search on Found Sound'
  },
  {
    url: (name) => `https://synthshop.no/search?q=${ name }`,
    label: 'Synthshop 🇳🇴',
    icon: 'store',
    tooltip: 'Search on Synthshop'
  },
];
