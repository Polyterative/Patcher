import { CV } from 'src/app/models/cv';
import { RackedModule } from 'src/app/models/module';
import { isBlankModule } from './rack-blank-module.constants';
import {
  SignalTypeFamily,
} from './rack-signal-analysis.models';
import {
  GENERIC_SIGNAL_TOKENS,
  SIGNAL_FAMILY_ORDER,
  SIGNAL_FAMILY_TAG_PATTERNS,
  SIGNAL_KEYWORD_PATTERNS,
} from './rack-signal-analysis.constants';

export function moduleContextParts(rackedModule: RackedModule): string[] {
  return [
    rackedModule.module.name,
    rackedModule.module.description,
    ...(rackedModule.module.tags ?? []).map(entry => entry?.tag?.name),
  ]
    .map(value => value?.trim().toLowerCase())
    .filter((value): value is string => !!value);
}

export function moduleContextMatches(rackedModule: RackedModule, pattern: RegExp): boolean {
  return moduleContextParts(rackedModule).some(value => pattern.test(value));
}

export function classifySignalFamily(cv: CV | null | undefined): SignalTypeFamily {
  if (!cv) {
    return 'other';
  }

  if (cv.isVOCT) {
    return 'pitch';
  }

  if (cv.isAudio) {
    return 'audio';
  }

  if (cv.isDCC) {
    return 'clock';
  }

  const normalizedName = cv.name?.trim().toLowerCase() ?? '';

  for (const family of SIGNAL_FAMILY_ORDER) {
    if (family === 'other') {
      continue;
    }

    if (SIGNAL_KEYWORD_PATTERNS[family].some(pattern => pattern.test(normalizedName))) {
      return family;
    }
  }

  return 'other';
}

export function moduleTagAffinity(rackedModule: RackedModule, family: Exclude<SignalTypeFamily, 'other'>): boolean {
  const contextTokens = moduleContextParts(rackedModule);
  return contextTokens.some(value => SIGNAL_FAMILY_TAG_PATTERNS[family].some(pattern => pattern.test(value)));
}

export function classifyModuleFamilies(rackedModule: RackedModule): Set<SignalTypeFamily> {
  const families = new Set<SignalTypeFamily>();

  for (const value of moduleContextParts(rackedModule)) {
    for (const family of SIGNAL_FAMILY_ORDER) {
      if (family === 'other') {
        continue;
      }

      if (
        SIGNAL_FAMILY_TAG_PATTERNS[family].some(pattern => pattern.test(value))
        || SIGNAL_KEYWORD_PATTERNS[family].some(pattern => pattern.test(value))
      ) {
        families.add(family);
      }
    }
  }

  return families;
}

export function resolveSignalFamily(
  sourceFamily: SignalTypeFamily,
  destinationFamily: SignalTypeFamily,
  sourceModuleFamilies: Set<SignalTypeFamily>,
  destinationModuleFamilies: Set<SignalTypeFamily>
): SignalTypeFamily {
  if (sourceFamily !== 'other') {
    return sourceFamily;
  }

  if (destinationFamily !== 'other') {
    return destinationFamily;
  }

  for (const family of SIGNAL_FAMILY_ORDER) {
    if (family === 'other') {
      continue;
    }

    if (sourceModuleFamilies.has(family) && destinationModuleFamilies.has(family)) {
      return family;
    }
  }

  for (const family of SIGNAL_FAMILY_ORDER) {
    if (family === 'other') {
      continue;
    }

    if (sourceModuleFamilies.has(family) || destinationModuleFamilies.has(family)) {
      return family;
    }
  }

  return 'other';
}

export function normalizedTokenOverlap(a: string, b: string, options?: {ignoreTokens?: Set<string>}): number {
  const aTokens = new Set(normalizeSignalTokens(a, options));
  const bTokens = new Set(normalizeSignalTokens(b, options));
  return Array.from(aTokens).filter(token => bTokens.has(token)).length;
}

export function normalizeSignalTokens(value: string, options?: {ignoreTokens?: Set<string>}): string[] {
  return value
    .toLowerCase()
    .replace(/1v\/oct/g, 'voct')
    .replace(/v\/oct/g, 'voct')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length > 1)
    .filter(token => !options?.ignoreTokens?.has(token));
}

export function sortTagNames(rackedModule: RackedModule): string[] {
  return [...(rackedModule.module.tags ?? [])]
    .sort((a, b) => (b?.voteCount?.length ?? 0) - (a?.voteCount?.length ?? 0) || compareNames(a?.tag?.name, b?.tag?.name))
    .map(entry => entry?.tag?.name?.trim())
    .filter((name): name is string => !!name);
}

export function sortCvNames(cvs: CV[] | null | undefined): string[] {
  return sortNames((cvs ?? []).map(cv => cv?.name?.trim()).filter((name): name is string => !!name));
}

export function sortNames(names: string[]): string[] {
  return [...names].sort(compareNames);
}

export function compareNames(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? '').localeCompare(b ?? '', undefined, {numeric: true, sensitivity: 'base'});
}

export function flattenRackedModules(rowedRackedModules: RackedModule[][] | null | undefined): RackedModule[] {
  return (rowedRackedModules ?? []).flat().filter(rackedModule => !isBlankModule(rackedModule.module.id));
}
