import { MinimalModule } from 'src/app/models/module';
import {
  ModularGridCandidate,
  ModularGridMatchedModule,
  ModularGridMatchPreview,
  ModularGridRackModulePlacement,
  ModularGridResolvedPlacementSummary,
  ModularGridSourceModule
} from './modulargrid-import.types';
import { ModularGridParseResult } from './modulargrid-import.types';
import { calculateBlankIdForSizeAndStandard } from '../../rack-detail-data.utils';

const LOW_THRESHOLD = 0.72;
const HIGH_THRESHOLD = 1.45;
const AMBIGUOUS_SCORE_BAND = 0.12;
const CLEAR_LEADER_GAP = 0.15;
const COMPACT_CONTAINS_SCORE = 0.88;
const MAX_CANDIDATE_SEARCH_TERMS = 80;

const QUALIFIER_TOKENS = new Set([
  'aluminium',
  'aluminum',
  'black',
  'color',
  'colour',
  'edition',
  'gold',
  'gray',
  'grey',
  'panel',
  'silver',
  'version',
  'white'
]);

const BLANK_TOKENS = new Set([
  'blank',
  'blind',
  'empty',
  'filler',
  'hp',
  'panel',
  'spacer',
  'vented'
]);

function stripDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[µμ]/g, 'u');
}

function splitCompactCaseBoundaries(value: string): string {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2');
}

export function normalizeModularGridModuleName(name: string): string {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
    .replace(/\b(?:black\s*&\s*gold|black\s+gold|black|silver|gold|white|grey|gray)\s+panel\b/g, ' ')
    .replace(/[_/\\|+]/g, ' ')
    .replace(/[–—-]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(token => token && !QUALIFIER_TOKENS.has(token))
    .join(' ');
}

function addCandidateSearchTerm(terms: Set<string>, term: string): void {
  const normalizedTerm = normalizeModularGridModuleName(term);
  if (normalizedTerm.length >= 4 || /\d/.test(normalizedTerm)) {
    terms.add(normalizedTerm);
  }
}

export function buildModularGridCandidateSearchTerms(sourceModules: ModularGridSourceModule[]): string[] {
  const terms = new Set<string>();

  sourceModules
    .filter(source => !isModularGridBlankOrSpacer(source.name))
    .forEach(source => {
      const normalizedVariants = [
        normalizeModularGridModuleName(source.name),
        normalizeModularGridModuleName(splitCompactCaseBoundaries(source.name))
      ].filter(Boolean);

      normalizedVariants.forEach(normalizedName => {
        const tokens = normalizedName.split(/\s+/).filter(Boolean);
        addCandidateSearchTerm(terms, normalizedName);
        addCandidateSearchTerm(terms, tokens.join(''));

        tokens.forEach(token => addCandidateSearchTerm(terms, token));

        tokens.forEach((_token, index) => {
          for (let windowSize = 2; windowSize <= 3; windowSize += 1) {
            const tokenWindow = tokens.slice(index, index + windowSize);
            if (tokenWindow.length === windowSize) {
              addCandidateSearchTerm(terms, tokenWindow.join(' '));
            }
          }
        });
      });
    });

  return [...terms].slice(0, MAX_CANDIDATE_SEARCH_TERMS);
}

function compactNormalizedName(name: string): string {
  return normalizeModularGridModuleName(name).replace(/\s+/g, '');
}

function tokensForName(name: string): string[] {
  const normalizedName = normalizeModularGridModuleName(name);
  return normalizedName ? normalizedName.split(/\s+/) : [];
}

export function isModularGridBlankOrSpacer(name: string): boolean {
  const tokens = tokensForName(name);
  if (tokens.length === 0) {
    return true;
  }

  const hasBlankMarker = tokens.some(token => BLANK_TOKENS.has(token));
  const onlyBlankWords = tokens.every(token => BLANK_TOKENS.has(token) || /^\d+(?:u|hp)?$/.test(token));

  return hasBlankMarker && onlyBlankWords;
}

function jaccardScore(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter(token => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  const subsetBoost = intersection === Math.min(leftSet.size, rightSet.size) ? 0.08 : 0;

  return Math.min(1, (intersection / union) + subsetBoost);
}

function compactNameScore(left: string, right: string): number {
  const leftCompact = compactNormalizedName(left);
  const rightCompact = compactNormalizedName(right);

  if (!leftCompact || !rightCompact) {
    return 0;
  }

  if (leftCompact === rightCompact) {
    return 1;
  }

  const shortestLength = Math.min(leftCompact.length, rightCompact.length);
  if (shortestLength >= 5 && (leftCompact.includes(rightCompact) || rightCompact.includes(leftCompact))) {
    return COMPACT_CONTAINS_SCORE;
  }

  return 0;
}

function moduleManufacturerName(module: MinimalModule): string {
  const manufacturerName = module.manufacturer?.name;
  return typeof manufacturerName === 'string' ? manufacturerName.trim() : '';
}

function scoreNameAgainstCandidate(sourceName: string, candidateName: string): number {
  const sourceTokens = sourceName.split(/\s+/).filter(Boolean);
  const candidateTokens = candidateName.split(/\s+/).filter(Boolean);
  const tokenScore = sourceName && candidateName && sourceName === candidateName
    ? 1
    : jaccardScore(sourceTokens, candidateTokens);

  return Math.max(tokenScore, compactNameScore(sourceName, candidateName));
}

function hpScore(sourceHp: number, candidateHp: number): number {
  if (!Number.isFinite(sourceHp) || !Number.isFinite(candidateHp)) {
    return 0;
  }

  const delta = Math.abs(sourceHp - candidateHp);
  if (delta <= 1) {
    return 1;
  }
  if (delta >= 3) {
    return 0;
  }

  return (3 - delta) / 2;
}

function scoreCandidate(source: ModularGridSourceModule, candidate: MinimalModule): ModularGridCandidate | null {
  const sourceName = normalizeModularGridModuleName(source.name);
  const candidateName = normalizeModularGridModuleName(candidate.name);
  const candidateNameWithManufacturer = normalizeModularGridModuleName(
    [moduleManufacturerName(candidate), candidate.name].filter(Boolean).join(' ')
  );
  const nameScore = Math.max(
    scoreNameAgainstCandidate(sourceName, candidateName),
    scoreNameAgainstCandidate(sourceName, candidateNameWithManufacturer)
  );

  if (nameScore <= 0) {
    return null;
  }

  const moduleHpScore = hpScore(source.inferredHp, candidate.hp);
  const score = nameScore + (moduleHpScore * 0.5);

  return {
    module: candidate,
    score,
    nameScore,
    hpScore: moduleHpScore
  };
}

function matchSourceModule(source: ModularGridSourceModule, catalogue: MinimalModule[]): ModularGridMatchedModule {
  if (isModularGridBlankOrSpacer(source.name)) {
    return {
      source,
      bucket: 'blank',
      candidates: []
    };
  }

  const candidates = catalogue
    .map(candidate => scoreCandidate(source, candidate))
    .filter((candidate): candidate is ModularGridCandidate => !!candidate && candidate.score >= LOW_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return {
      source,
      bucket: 'unmatched',
      candidates: []
    };
  }

  const [topCandidate, secondCandidate] = candidates;
  const closeCandidates = candidates.filter(candidate => topCandidate.score - candidate.score <= AMBIGUOUS_SCORE_BAND);

  if (closeCandidates.length > 1) {
    return {
      source,
      bucket: 'ambiguous',
      candidates: closeCandidates
    };
  }

  if (topCandidate.score >= HIGH_THRESHOLD) {
    return {
      source,
      bucket: 'confident',
      candidates: [topCandidate]
    };
  }

  if (!secondCandidate || topCandidate.score - secondCandidate.score >= CLEAR_LEADER_GAP) {
    return {
      source,
      bucket: 'likely',
      candidates: [topCandidate]
    };
  }

  return {
    source,
    bucket: 'ambiguous',
    candidates: closeCandidates
  };
}

export function buildModularGridMatchPreview(
  parseResult: ModularGridParseResult,
  catalogue: MinimalModule[]
): ModularGridMatchPreview | null {
  if (parseResult.status !== 'valid' || !parseResult.rack) {
    return null;
  }

  const matchedModules = parseResult.modules.map(module => matchSourceModule(module, catalogue));

  return {
    rack: parseResult.rack,
    confident: matchedModules.filter(module => module.bucket === 'confident'),
    likely: matchedModules.filter(module => module.bucket === 'likely'),
    ambiguous: matchedModules.filter(module => module.bucket === 'ambiguous'),
    unmatched: matchedModules.filter(module => module.bucket === 'unmatched'),
    blank: matchedModules.filter(module => module.bucket === 'blank'),
    counts: {
      confident: matchedModules.filter(module => module.bucket === 'confident').length,
      likely: matchedModules.filter(module => module.bucket === 'likely').length,
      ambiguous: matchedModules.filter(module => module.bucket === 'ambiguous').length,
      unmatched: matchedModules.filter(module => module.bucket === 'unmatched').length,
      blank: matchedModules.filter(module => module.bucket === 'blank').length
    }
  };
}

export function toPatcherRackModulePlacement(
  source: ModularGridSourceModule,
  moduleId: number
): ModularGridRackModulePlacement {
  return {
    moduleId,
    row: source.row - 1,
    column: source.col - 1,
    sourceKey: source.key
  };
}

function resolveBlankHp(source: ModularGridSourceModule): number {
  const explicitHp = source.name.match(/\b(\d+)\s*hp\b/i);
  if (explicitHp) {
    return Number.parseInt(explicitHp[1], 10);
  }

  return source.inferredHp;
}

function resolveBlankPlacement(
  preview: ModularGridMatchPreview,
  source: ModularGridSourceModule
): ModularGridRackModulePlacement | null {
  const blankStandard = preview.rack.rows1u.includes(source.row) ? 1 : 0;
  const blankModuleId = calculateBlankIdForSizeAndStandard(resolveBlankHp(source), blankStandard);

  return blankModuleId > 0
    ? toPatcherRackModulePlacement(source, blankModuleId)
    : null;
}

export function resolveModularGridPlacements(
  preview: ModularGridMatchPreview | null,
  ambiguousSelections: Record<string, number | null | undefined>
): ModularGridResolvedPlacementSummary {
  if (!preview) {
    return {
      placements: [],
      skipped: 0,
      allAmbiguousResolved: false
    };
  }

  const resolvedConfident = preview.confident
    .map(match => toPatcherRackModulePlacement(match.source, match.candidates[0].module.id));
  const resolvedLikely = preview.likely
    .map(match => toPatcherRackModulePlacement(match.source, match.candidates[0].module.id));
  const resolvedAmbiguous = preview.ambiguous
    .filter(match => ambiguousSelections[match.source.key] !== undefined && ambiguousSelections[match.source.key] !== null)
    .map(match => toPatcherRackModulePlacement(match.source, ambiguousSelections[match.source.key] as number));
  const resolvedBlanks = preview.blank
    .map(match => resolveBlankPlacement(preview, match.source))
    .filter((placement): placement is ModularGridRackModulePlacement => !!placement);
  const skippedBlanks = preview.blank.length - resolvedBlanks.length;
  const skippedAmbiguous = preview.ambiguous
    .filter(match => ambiguousSelections[match.source.key] === undefined || ambiguousSelections[match.source.key] === null)
    .length;

  return {
    placements: [
      ...resolvedConfident,
      ...resolvedLikely,
      ...resolvedAmbiguous,
      ...resolvedBlanks
    ],
    skipped: preview.unmatched.length + skippedBlanks + skippedAmbiguous,
    allAmbiguousResolved: true
  };
}
