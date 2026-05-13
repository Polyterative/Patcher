import { RackedModule } from 'src/app/models/module';
import { buildRackFunctionVisual } from './rack-function-visuals.utils';
import {
  SignalAnalysisOptions,
  SignalDestinationGroup,
  SignalDestinationMatch,
  SignalDestinationTier,
  SignalDestinationTierGroup,
  SignalFocusArea,
  SignalModuleAnalysis,
  SignalTypeFamily,
} from './rack-signal-analysis.models';
import {
  DEFAULT_SIGNAL_MAX_MATCHES,
  GENERIC_SIGNAL_TOKENS,
  PITCH_CONTROL_DESTINATION_PATTERN,
  SIGNAL_FAMILY_LABELS,
  SIGNAL_FAMILY_ORDER,
  SIGNAL_TIER_LABELS,
  SIGNAL_TIER_ORDER,
  TIMING_DESTINATION_PATTERN,
} from './rack-signal-analysis.constants';
import {
  classifyModuleFamilies,
  classifySignalFamily,
  flattenRackedModules,
  moduleContextMatches,
  moduleTagAffinity,
  normalizedTokenOverlap,
  resolveSignalFamily,
  sortCvNames,
  sortTagNames,
} from './rack-signal-analysis.helpers';

export type {
  SignalAnalysisOptions,
  SignalDestinationConfidence,
  SignalDestinationGroup,
  SignalDestinationMatch,
  SignalDestinationTier,
  SignalDestinationTierGroup,
  SignalFocusArea,
  SignalModuleAnalysis,
  SignalTypeFamily,
} from './rack-signal-analysis.models';

export function suggestSignalFocusArea(rackedModule: RackedModule): SignalFocusArea {
  const functionRole = buildRackFunctionVisual(rackedModule).roleLabel;
  const outputs = rackedModule.module.outs ?? [];

  if (functionRole === 'Timing' || outputs.some(output => output?.isDCC) || moduleContextMatches(rackedModule, TIMING_DESTINATION_PATTERN)) {
    return 'clock';
  }

  if (functionRole === 'Modulation' || moduleContextMatches(rackedModule, /\blfo\b|\benvelope\b|\bfunction\b|\bmod\b|\bcv\b/)) {
    return 'modulation';
  }

  if (functionRole === 'Voices' || outputs.some(output => output?.isVOCT) || moduleContextMatches(rackedModule, /\bvco\b|\bosc\b|\bvoice\b|\bpitch\b/)) {
    return 'tone';
  }

  if (functionRole === 'Tone shaping' || moduleContextMatches(rackedModule, /\bfilter\b|\bvca\b|\beffect\b|\bdelay\b|\breverb\b/)) {
    return 'mixing';
  }

  if (outputs.some(output => output?.isAudio)) {
    return 'mixing';
  }

  return 'modulation';
}

export function buildSignalModuleAnalysis(
  hoveredModule: RackedModule,
  rowedRackedModules: RackedModule[][] | null | undefined,
  options: SignalAnalysisOptions = {}
): SignalModuleAnalysis {
  const allMatches = buildSignalDestinationMatches(hoveredModule, rowedRackedModules, options.focusArea);
  const maxMatches = options.maxMatches ?? DEFAULT_SIGNAL_MAX_MATCHES;
  const visibleMatches = allMatches.slice(0, maxMatches);

  return {
    inputNames: sortCvNames(hoveredModule.module.ins),
    outputNames: sortCvNames(hoveredModule.module.outs),
    tagNames: sortTagNames(hoveredModule),
    destinationMatches: visibleMatches,
    destinationTierGroups: buildSignalDestinationTierGroups(visibleMatches),
    totalDestinations: visibleMatches.length,
    hiddenDestinationCount: Math.max(0, allMatches.length - visibleMatches.length),
  };
}

export function buildSignalDestinationGroups(
  hoveredModule: RackedModule,
  rowedRackedModules: RackedModule[][] | null | undefined,
  options: SignalAnalysisOptions = {}
): SignalDestinationGroup[] {
  const allMatches = buildSignalDestinationMatches(hoveredModule, rowedRackedModules, options.focusArea);
  return groupSignalDestinationMatches(allMatches.slice(0, options.maxMatches ?? DEFAULT_SIGNAL_MAX_MATCHES));
}

function createSignalFamilyGroupMap(): Map<SignalTypeFamily, SignalDestinationMatch[]> {
  const map = new Map<SignalTypeFamily, SignalDestinationMatch[]>();
  for (const family of SIGNAL_FAMILY_ORDER) {
    map.set(family, []);
  }
  return map;
}

function buildSignalDestinationMatches(
  hoveredModule: RackedModule,
  rowedRackedModules: RackedModule[][] | null | undefined,
  focusArea?: SignalFocusArea
): SignalDestinationMatch[] {
  const groupedMatches = createSignalFamilyGroupMap();

  for (const candidate of flattenRackedModules(rowedRackedModules)) {
    if (candidate === hoveredModule) {
      continue;
    }

    const match = buildSignalDestinationMatch(hoveredModule, candidate);
    if (!match || !matchesSignalFocusArea(match, focusArea)) {
      continue;
    }

    groupedMatches.get(match.family)?.push(match);
  }

  return SIGNAL_FAMILY_ORDER
    .map(family => ({
      family,
      label: SIGNAL_FAMILY_LABELS[family],
      matches: (groupedMatches.get(family) ?? [])
        .sort((a, b) => b.score - a.score || a.destination.module.name.localeCompare(b.destination.module.name))
    }))
    .flatMap(group => group.matches)
    .sort(sortSignalMatches);
}

function groupSignalDestinationMatches(matches: SignalDestinationMatch[]): SignalDestinationGroup[] {
  const groupedMatches = createSignalFamilyGroupMap();

  for (const match of matches) {
    groupedMatches.get(match.family)?.push(match);
  }

  return SIGNAL_FAMILY_ORDER
    .map(family => ({
      family,
      label: SIGNAL_FAMILY_LABELS[family],
      matches: groupedMatches.get(family) ?? []
    }))
    .filter(group => group.matches.length > 0);
}

function buildSignalDestinationMatch(sourceModule: RackedModule, destinationModule: RackedModule): SignalDestinationMatch | null {
  const sourceOutputs = sourceModule.module.outs ?? [];
  const destinationInputs = destinationModule.module.ins ?? [];
  const sourceRoleLabel = buildRackFunctionVisual(sourceModule).roleLabel;
  const destinationRoleLabel = buildRackFunctionVisual(destinationModule).roleLabel;

  if (sourceOutputs.length === 0 || destinationInputs.length === 0) {
    return null;
  }

  let bestFamily: SignalTypeFamily = 'other';
  let bestScore = 0;
  let bestRoleAffinityBonus = 0;
  let bestReasonLabel = 'connection fit';
  let bestOutputName: string | null = null;
  let bestInputName: string | null = null;
  const matchedOutputNames = new Set<string>();
  const matchedInputNames = new Set<string>();

  for (const sourceOutput of sourceOutputs) {
    for (const destinationInput of destinationInputs) {
      const pairScore = scoreSignalPair(
        sourceOutput,
        destinationInput,
        sourceModule,
        destinationModule,
        sourceRoleLabel,
        destinationRoleLabel
      );
      if (pairScore.score <= 0) {
        continue;
      }

        if (pairScore.score > bestScore || (pairScore.score === bestScore && pairScore.family !== 'other' && bestFamily === 'other')) {
          bestFamily = pairScore.family;
          bestScore = pairScore.score;
          bestRoleAffinityBonus = pairScore.roleAffinityBonus;
          bestReasonLabel = pairScore.reasonLabel;
          bestOutputName = sourceOutput.name?.trim() ?? null;
          bestInputName = destinationInput.name?.trim() ?? null;
        }

        if (pairScore.score >= 2) {
          matchedOutputNames.add(sourceOutput.name);
          matchedInputNames.add(destinationInput.name);
      }
    }
  }

  if (bestScore < 4) {
    return null;
  }

  if (matchedOutputNames.size === 0 && bestOutputName) {
    matchedOutputNames.add(bestOutputName);
  }

  if (matchedInputNames.size === 0 && bestInputName) {
    matchedInputNames.add(bestInputName);
  }

  return {
    destination: destinationModule,
    family: bestFamily,
    familyLabel: SIGNAL_FAMILY_LABELS[bestFamily],
    score: bestScore,
    confidence: bestScore >= 9 ? 'likely' : 'potential',
    tier: classifySignalTier(bestScore, bestRoleAffinityBonus),
    reasonLabel: bestReasonLabel,
    destinationRoleLabel,
    matchedOutputNames: sortNames(Array.from(matchedOutputNames)),
    matchedInputNames: sortNames(Array.from(matchedInputNames)),
  };
}

function scoreSignalPair(
  sourceOutput: CV,
  destinationInput: CV,
  sourceModule: RackedModule,
  destinationModule: RackedModule,
  sourceRoleLabel: string,
  destinationRoleLabel: string
): {score: number; family: SignalTypeFamily; roleAffinityBonus: number; reasonLabel: string} {
  const sourceFamily = classifySignalFamily(sourceOutput);
  const destinationFamily = classifySignalFamily(destinationInput);
  const sourceModuleFamilies = classifyModuleFamilies(sourceModule);
  const destinationModuleFamilies = classifyModuleFamilies(destinationModule);
  const sourceName = sourceOutput.name?.trim() ?? '';
  const destinationName = destinationInput.name?.trim() ?? '';
  const sharedTokenCount = normalizedTokenOverlap(sourceName, destinationName);
  const meaningfulSharedTokenCount = normalizedTokenOverlap(sourceName, destinationName, {
    ignoreTokens: GENERIC_SIGNAL_TOKENS
  });
  const family = resolveSignalFamily(sourceFamily, destinationFamily, sourceModuleFamilies, destinationModuleFamilies);
  const relationshipHint = resolveSignalRelationshipHint(
    sourceModule,
    destinationModule,
    family,
    sourceRoleLabel,
    destinationRoleLabel,
    meaningfulSharedTokenCount
  );

  if (isBlockedSignalRelationship(sourceModule, destinationModule, family, sourceRoleLabel, destinationRoleLabel)) {
    return {score: 0, family, roleAffinityBonus: 0, reasonLabel: relationshipHint.reasonLabel};
  }

  if (sourceFamily !== 'other' && destinationFamily !== 'other' && sourceFamily !== destinationFamily) {
    return {score: 0, family, roleAffinityBonus: 0, reasonLabel: relationshipHint.reasonLabel};
  }

  let score = 0;

  if (family !== 'other') {
    if (sourceFamily === family && destinationFamily === family) {
      score += 7;
    } else if (sourceFamily === family || destinationFamily === family) {
      score += 4;
    }

    if (sourceModuleFamilies.has(family)) {
      score += 1;
    }

    if (destinationModuleFamilies.has(family)) {
      score += 2;
    }
  } else if (meaningfulSharedTokenCount === 0) {
    return {score: 0, family: 'other', roleAffinityBonus: 0, reasonLabel: relationshipHint.reasonLabel};
  }

  if (sourceOutput.isAudio && destinationInput.isAudio) {
    score += 3;
  }

  if (sourceOutput.isDCC && destinationInput.isDCC) {
    score += 3;
  }

  if (sourceOutput.isVOCT && destinationInput.isVOCT) {
    score += 4;
  }

  score += sharedTokenCount;
  score += meaningfulSharedTokenCount * 2;

  if (family !== 'other' && moduleTagAffinity(sourceModule, family)) {
    score += 1;
  }

  if (family !== 'other' && moduleTagAffinity(destinationModule, family)) {
    score += 2;
  }

  score += relationshipHint.scoreBonus;

  if (sourceName && destinationName && meaningfulSharedTokenCount === 0 && family === 'other') {
    return {score: 0, family: 'other', roleAffinityBonus: 0, reasonLabel: relationshipHint.reasonLabel};
  }

  if (score > 0 && family !== 'other' && sharedTokenCount === 0 && !destinationModuleFamilies.has(family) && destinationFamily === 'other') {
    score -= 1;
  }

  return {
    score,
    family: family !== 'other' ? family : 'other',
    roleAffinityBonus: relationshipHint.scoreBonus,
    reasonLabel: relationshipHint.reasonLabel
  };
}

function buildSignalDestinationTierGroups(matches: SignalDestinationMatch[]): SignalDestinationTierGroup[] {
  return SIGNAL_TIER_ORDER
    .map(tier => ({
      tier,
      label: SIGNAL_TIER_LABELS[tier],
      groups: groupSignalDestinationMatches(matches)
        .map(group => ({
          family: group.family,
          label: group.label,
          matches: group.matches.filter(match => match.tier === tier)
        }))
        .filter(group => group.matches.length > 0)
    }))
    .filter(group => group.groups.length > 0);
}

function matchesSignalFocusArea(match: SignalDestinationMatch, focusArea?: SignalFocusArea): boolean {
  if (!focusArea) {
    return true;
  }

  if (focusArea === 'voices') {
    return match.family === 'pitch'
      || match.destinationRoleLabel === 'Voices'
      || match.reasonLabel === 'pitch control';
  }

  if (focusArea === 'tone') {
    return match.family === 'audio'
      || match.destinationRoleLabel === 'Tone shaping'
      || match.reasonLabel === 'tone shaping';
  }

  if (focusArea === 'mixing') {
    return match.reasonLabel === 'mixing'
      || match.reasonLabel === 'audio path'
      || match.reasonLabel === 'signal routing';
  }

  if (focusArea === 'modulation') {
    return match.family === 'modulation'
      || match.destinationRoleLabel === 'Modulation'
      || match.reasonLabel === 'modulation target'
      || match.reasonLabel === 'control input';
  }

  if (focusArea === 'clock') {
    return match.family === 'clock'
      || match.destinationRoleLabel === 'Timing'
      || match.reasonLabel === 'timing sync';
  }

  return true;
}

function sortSignalMatches(a: SignalDestinationMatch, b: SignalDestinationMatch): number {
  const tierDelta = SIGNAL_TIER_ORDER.indexOf(a.tier) - SIGNAL_TIER_ORDER.indexOf(b.tier);
  if (tierDelta !== 0) {
    return tierDelta;
  }

  const familyDelta = SIGNAL_FAMILY_ORDER.indexOf(a.family) - SIGNAL_FAMILY_ORDER.indexOf(b.family);
  return b.score - a.score || familyDelta || a.destination.module.name.localeCompare(b.destination.module.name);
}

function classifySignalTier(score: number, roleAffinityBonus: number): SignalDestinationTier {
  if (score >= 9 || roleAffinityBonus >= 3) {
    return 'natural';
  }

  return 'exploratory';
}

function resolveSignalRelationshipHint(
  sourceModule: RackedModule,
  destinationModule: RackedModule,
  family: SignalTypeFamily,
  sourceRoleLabel: string,
  destinationRoleLabel: string,
  meaningfulSharedTokenCount: number
): {scoreBonus: number; reasonLabel: string} {
  if (moduleContextMatches(destinationModule, /\bmix(?:er|ing)?\b|\bsum\b|\boutput\b/)) {
    return {scoreBonus: sourceRoleLabel === 'Voices' || family === 'audio' ? 3 : 2, reasonLabel: 'mixing'};
  }

  if (moduleContextMatches(destinationModule, /\bfilter\b|\bvca\b|\beffect\b|\bdelay\b|\breverb\b|\bwave(?:folder)?\b|\bdrive\b/)) {
    return {scoreBonus: sourceRoleLabel === 'Voices' || family === 'audio' ? 3 : 2, reasonLabel: 'tone shaping'};
  }

  if (moduleContextMatches(destinationModule, /\blevel\b|\bgain\b|\bamp\b/)) {
    return {scoreBonus: 2, reasonLabel: 'level control'};
  }

  if (family === 'pitch') {
    return {scoreBonus: destinationRoleLabel === 'Voices' ? 3 : 2, reasonLabel: 'pitch control'};
  }

  if (family === 'clock') {
    return {scoreBonus: destinationRoleLabel === 'Timing' ? 3 : 2, reasonLabel: 'timing sync'};
  }

  if (family === 'modulation' && (destinationRoleLabel === 'Voices' || destinationRoleLabel === 'Tone shaping')) {
    return {scoreBonus: 3, reasonLabel: 'modulation target'};
  }

  if (family === 'modulation') {
    return {scoreBonus: 2, reasonLabel: 'control input'};
  }

  if (family === 'audio') {
    return {scoreBonus: 2, reasonLabel: 'audio path'};
  }

  if (meaningfulSharedTokenCount > 0) {
    return {scoreBonus: 1, reasonLabel: 'shared controls'};
  }

  if (destinationRoleLabel === 'Tone shaping') {
    return {scoreBonus: 2, reasonLabel: 'tone shaping'};
  }

  if (destinationRoleLabel === 'Timing') {
    return {scoreBonus: 2, reasonLabel: 'timing sync'};
  }

  if (destinationRoleLabel === 'Modulation') {
    return {scoreBonus: 2, reasonLabel: 'modulation target'};
  }

  if (destinationRoleLabel === 'Utilities') {
    return {scoreBonus: 1, reasonLabel: 'signal routing'};
  }

  return {scoreBonus: 0, reasonLabel: 'connection fit'};
}

function isBlockedSignalRelationship(
  sourceModule: RackedModule,
  destinationModule: RackedModule,
  family: SignalTypeFamily,
  sourceRoleLabel: string,
  destinationRoleLabel: string
): boolean {
  if (family === 'audio' && (destinationRoleLabel === 'Timing' || moduleContextMatches(destinationModule, TIMING_DESTINATION_PATTERN))) {
    return true;
  }

  if (
    family === 'audio'
    && (destinationRoleLabel === 'Voices' || moduleContextMatches(destinationModule, PITCH_CONTROL_DESTINATION_PATTERN))
    && !moduleContextMatches(destinationModule, /\bexternal\b|\bfeedback\b|\binput\b|\bfm\b/)
  ) {
    return true;
  }

  if (sourceRoleLabel === 'Voices' && family === 'audio' && destinationRoleLabel === 'Timing') {
    return true;
  }

  return false;
}
