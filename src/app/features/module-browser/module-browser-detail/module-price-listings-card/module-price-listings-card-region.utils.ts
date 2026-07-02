import { ModulePriceListing } from 'src/app/features/backend/supabase-queries';

export type ModulePriceContinentCode =
  | 'africa'
  | 'asia'
  | 'europe'
  | 'north_america'
  | 'oceania'
  | 'south_america'
  | 'united_kingdom'
  | 'unknown';

export type ModulePriceRegionFilter = 'all' | ModulePriceContinentCode;

export interface ModulePriceListingGroup {
  continentCode: ModulePriceContinentCode;
  label: string;
  listings: ModulePriceListing[];
}

export interface ModulePriceRegionFilterOption {
  value: ModulePriceRegionFilter;
  label: string;
}

export interface ModulePriceContinentDetectionInput {
  languages?: readonly string[] | null;
  language?: string | null;
  timeZone?: string | null;
}

export const DEFAULT_MODULE_PRICE_CONTINENT: ModulePriceContinentCode = 'europe';

export const MODULE_PRICE_CONTINENT_LABELS: Record<ModulePriceContinentCode, string> = {
  africa: 'Africa',
  asia: 'Asia',
  europe: 'Europe',
  north_america: 'North America',
  oceania: 'Oceania',
  south_america: 'South America',
  united_kingdom: 'UK',
  unknown: 'Unknown region'
};

export const MODULE_PRICE_REGION_RESULT_LABELS: Record<ModulePriceRegionFilter, string> = {
  all: 'all regions',
  ...MODULE_PRICE_CONTINENT_LABELS
};

const CONTINENT_ORDER: ReadonlyArray<ModulePriceContinentCode> = [
  'europe',
  'united_kingdom',
  'north_america',
  'asia',
  'oceania',
  'south_america',
  'africa',
  'unknown'
];

const SOUTH_AMERICA_TIME_ZONE_PREFIXES = [
  'America/Argentina/',
  'America/Bahia',
  'America/Belem',
  'America/Bogota',
  'America/Boa_Vista',
  'America/Campo_Grande',
  'America/Caracas',
  'America/Cayenne',
  'America/Cuiaba',
  'America/Eirunepe',
  'America/Fortaleza',
  'America/Guayaquil',
  'America/Guyana',
  'America/La_Paz',
  'America/Lima',
  'America/Maceio',
  'America/Manaus',
  'America/Montevideo',
  'America/Paramaribo',
  'America/Porto_Velho',
  'America/Recife',
  'America/Rio_Branco',
  'America/Santarem',
  'America/Santiago',
  'America/Sao_Paulo'
];

const COUNTRY_TO_CONTINENT = buildCountryToContinentMap({
  africa: 'AO BF BI BJ BW CD CF CG CI CM CV DZ EG ET GH KE MA MG ML MU MZ NA NG SN TN TZ ZA ZM ZW',
  asia: 'AE AF AM AZ BD BH BN BT CN GE HK ID IL IN IQ IR JO JP KH KR KW KZ LA LB LK MM MN MY NP OM PH PK QA RU SA SG TH TR TW VN',
  europe: 'AD AL AT BA BE BG BY CH CY CZ DE DK EE ES EU FI FR GR HR HU IE IS IT LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS SE SI SK SM UA',
  north_america: 'AG AI AW BB BM BS BZ CA CR CU DO GT HN JM MX NI PA PR SV US',
  oceania: 'AS AU FJ NZ',
  south_america: 'AR BO BR CL CO EC PE PY UY VE',
  united_kingdom: 'GB GG IM JE UK'
});

export function groupModulePriceListingsByContinent(
  listings: ReadonlyArray<ModulePriceListing>
): ModulePriceListingGroup[] {
  const groupsByContinent = listings.reduce(
    (groups, listing) => {
      const continentCode = getListingContinentCode(listing);
      const existingListings = groups.get(continentCode);
      if (existingListings) {
        existingListings.push(listing);
      } else {
        groups.set(continentCode, [listing]);
      }
      return groups;
    },
    new Map<ModulePriceContinentCode, ModulePriceListing[]>()
  );

  return [...groupsByContinent.entries()].map(([continentCode, groupListings]) => ({
    continentCode,
    label: MODULE_PRICE_CONTINENT_LABELS[continentCode],
    listings: groupListings
  }));
}

export function getListingContinentCode(
  listing: ModulePriceListing
): ModulePriceContinentCode {
  return getContinentForRegionCode(listing.countryCode);
}

export function getContinentForRegionCode(
  regionCode: string | null | undefined
): ModulePriceContinentCode {
  const normalizedRegionCode = regionCode?.trim().toUpperCase();
  if (!normalizedRegionCode) {
    return 'unknown';
  }

  return COUNTRY_TO_CONTINENT[normalizedRegionCode] ?? 'unknown';
}

export function detectPreferredModulePriceContinent(
  input?: ModulePriceContinentDetectionInput
): ModulePriceContinentCode {
  const detectionInput = input ?? getBrowserContinentDetectionInput();
  const languages = [
    ...(detectionInput.languages ?? []),
    detectionInput.language
  ].filter((language): language is string => Boolean(language));
  const timeZoneContinent = getContinentForTimeZone(detectionInput.timeZone);
  if (timeZoneContinent) {
    return timeZoneContinent;
  }

  const languageContinent = languages
    .map(getRegionCodeFromLanguageTag)
    .map(getContinentForRegionCode)
    .find(continentCode => continentCode !== 'unknown');

  if (languageContinent) {
    return languageContinent;
  }

  return DEFAULT_MODULE_PRICE_CONTINENT;
}

export function getRegionFilterResultLabel(
  regionFilter: ModulePriceRegionFilter,
  preferredContinent: ModulePriceContinentCode
): string {
  if (regionFilter !== 'all') {
    return MODULE_PRICE_REGION_RESULT_LABELS[regionFilter];
  }

  return `${MODULE_PRICE_CONTINENT_LABELS[preferredContinent]} first`;
}

export function compareModulePriceContinents(
  first: ModulePriceContinentCode,
  second: ModulePriceContinentCode,
  preferredContinent: ModulePriceContinentCode
): number {
  if (first === second) {
    return 0;
  }

  if (first === preferredContinent) {
    return -1;
  }

  if (second === preferredContinent) {
    return 1;
  }

  return CONTINENT_ORDER.indexOf(first) - CONTINENT_ORDER.indexOf(second);
}

export function isModulePriceRegionFilter(value: unknown): value is ModulePriceRegionFilter {
  if (value === 'all') {
    return true;
  }

  return typeof value === 'string' && value in MODULE_PRICE_CONTINENT_LABELS;
}

function getBrowserContinentDetectionInput(): ModulePriceContinentDetectionInput {
  const browserNavigator = typeof navigator === 'undefined' ? null : navigator;
  if (!browserNavigator) {
    return {};
  }

  const timeZone =
    typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;

  return {
    languages: browserNavigator?.languages ?? null,
    language: browserNavigator?.language ?? null,
    timeZone
  };
}

function getRegionCodeFromLanguageTag(languageTag: string): string | null {
  const tagParts = languageTag.trim().split(/[-_]/).filter(Boolean);

  return tagParts.find(
    (part, index) => index > 0 && /^[A-Za-z]{2}$/.test(part)
  )?.toUpperCase() ?? null;
}

function getContinentForTimeZone(
  timeZone: string | null | undefined
): ModulePriceContinentCode | null {
  const normalizedTimeZone = timeZone?.trim();
  if (!normalizedTimeZone) {
    return null;
  }

  if (
    normalizedTimeZone === 'Europe/London'
    || normalizedTimeZone === 'Europe/Guernsey'
    || normalizedTimeZone === 'Europe/Isle_of_Man'
    || normalizedTimeZone === 'Europe/Jersey'
  ) {
    return 'united_kingdom';
  }

  if (normalizedTimeZone.startsWith('Europe/')) {
    return 'europe';
  }

  if (normalizedTimeZone.startsWith('Africa/')) {
    return 'africa';
  }

  if (normalizedTimeZone.startsWith('Asia/')) {
    return 'asia';
  }

  if (
    normalizedTimeZone.startsWith('Australia/')
    || normalizedTimeZone.startsWith('Pacific/')
    || normalizedTimeZone === 'Indian/Christmas'
    || normalizedTimeZone === 'Indian/Cocos'
  ) {
    return 'oceania';
  }

  if (
    normalizedTimeZone.startsWith('America/')
    || normalizedTimeZone.startsWith('Atlantic/Bermuda')
  ) {
    return SOUTH_AMERICA_TIME_ZONE_PREFIXES.some(prefix =>
      normalizedTimeZone.startsWith(prefix)
    )
      ? 'south_america'
      : 'north_america';
  }

  return null;
}

function buildCountryToContinentMap(
  continentRegions: Record<Exclude<ModulePriceContinentCode, 'unknown'>, string>
): Readonly<Record<string, ModulePriceContinentCode>> {
  return Object.entries(continentRegions).reduce(
    (regionMap, [continentCode, regions]) => {
      regions.split(' ').forEach(region => {
        regionMap[region] = continentCode as ModulePriceContinentCode;
      });
      return regionMap;
    },
    {} as Record<string, ModulePriceContinentCode>
  );
}
