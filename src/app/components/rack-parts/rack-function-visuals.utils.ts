import { RackedModule } from 'src/app/models/module';
import {
  RACK_BALANCE_AXES,
  RackBalanceAxisDefinition,
  RackBalanceAxisId
} from './rack-balance-analysis.constants';
import { isBlankModule } from './rack-blank-module.constants';

export interface RackFunctionVisual {
  className: string;
  roleLabel: string;
  tagLabel: string;
  icon: string;
}

interface RackFunctionAxisScore {
  score: number;
  matchedTagName: string | null;
  matchedTagVoteCount: number;
  matchedTagStrength: number;
}

const FUNCTION_AXIS_CLASS_NAMES: Record<RackBalanceAxisId, string> = {
  voices: 'functionAnalysisModule--voices',
  modulation: 'functionAnalysisModule--modulation',
  utilities: 'functionAnalysisModule--utilities',
  timing: 'functionAnalysisModule--timing',
  tone: 'functionAnalysisModule--tone',
};

const BLANK_VISUAL: RackFunctionVisual = {
  className: 'functionAnalysisModule--blank',
  roleLabel: 'Blank',
  tagLabel: 'Spacer',
  icon: 'space_dashboard'
};

const UNCLASSIFIED_VISUAL: RackFunctionVisual = {
  className: 'functionAnalysisModule--unclassified',
  roleLabel: 'Unclassified',
  tagLabel: 'No recognized function tag',
  icon: 'category'
};

export function buildRackFunctionVisual(rackedModule: RackedModule): RackFunctionVisual {
  if (isBlankModule(rackedModule.module.id)) {
    return BLANK_VISUAL;
  }

  const scores = new Map<RackBalanceAxisId, RackFunctionAxisScore>(
    RACK_BALANCE_AXES.map(axis => [axis.id, {
      score: 0,
      matchedTagName: null,
      matchedTagVoteCount: -1,
      matchedTagStrength: -1
    }])
  );

  for (const entry of rackedModule.module.tags ?? []) {
    const tagName = entry?.tag?.name?.trim();
    const tagType = normalizeTagType(entry?.tag?.type);
    const voteCount = getTagVoteCount(entry);

    if (!tagName) {
      continue;
    }

    for (const axis of RACK_BALANCE_AXES) {
      const baseScore = scoreTagAgainstAxis(axis, tagName, tagType);
      if (baseScore <= 0) {
        continue;
      }

      const current = scores.get(axis.id);
      if (!current) {
        continue;
      }

      const weightedScore = baseScore * Math.max(voteCount, 1);
      const shouldPromoteTag = weightedScore > current.matchedTagStrength
        || (weightedScore === current.matchedTagStrength && voteCount > current.matchedTagVoteCount)
        || (
          weightedScore === current.matchedTagStrength
          && voteCount === current.matchedTagVoteCount
          && current.matchedTagName === null
        );

      scores.set(axis.id, {
        score: current.score + weightedScore,
        matchedTagName: shouldPromoteTag ? tagName : current.matchedTagName,
        matchedTagVoteCount: shouldPromoteTag ? voteCount : current.matchedTagVoteCount,
        matchedTagStrength: shouldPromoteTag ? weightedScore : current.matchedTagStrength
      });
    }
  }

  const strongestAxis = RACK_BALANCE_AXES.reduce<RackBalanceAxisDefinition | null>((bestAxis, axis) => {
    const axisScore = scores.get(axis.id)?.score ?? 0;
    const bestScore = bestAxis ? (scores.get(bestAxis.id)?.score ?? 0) : 0;

    if (axisScore <= 0) {
      return bestAxis;
    }

    if (!bestAxis || axisScore > bestScore) {
      return axis;
    }

    return bestAxis;
  }, null);

  if (!strongestAxis) {
    return UNCLASSIFIED_VISUAL;
  }

  const strongestAxisScore = scores.get(strongestAxis.id);

  return {
    className: FUNCTION_AXIS_CLASS_NAMES[strongestAxis.id],
    roleLabel: strongestAxis.label,
    tagLabel: strongestAxisScore?.matchedTagName
      ? `Primary tag: ${ strongestAxisScore.matchedTagName }`
      : 'Recognized by module tags',
    icon: strongestAxis.icon
  };
}

function scoreTagAgainstAxis(
  axis: RackBalanceAxisDefinition,
  tagName: string,
  tagType: string | null
): number {
  if (matchesDbTagName(axis, tagName)) {
    return exactMatchWeight(tagType);
  }

  const patterns = getPatternsForTagType(axis, tagType);
  return patterns.some(pattern => pattern.test(tagName)) ? patternMatchWeight(tagType) : 0;
}

function normalizeTagType(tagType: unknown): string | null {
  if (typeof tagType === 'string') {
    return tagType.trim().toLowerCase();
  }

  if (typeof tagType === 'number') {
    if (tagType === 0) {
      return 'purpose';
    }
    if (tagType === 1) {
      return 'nature';
    }
    if (tagType === 2) {
      return 'character';
    }
  }

  return null;
}

function getTagVoteCount(
  entry: RackedModule['module']['tags'][number] | null | undefined
): number {
  return entry?.voteCount?.length ?? 0;
}

function matchesDbTagName(axis: RackBalanceAxisDefinition, tagName: string): boolean {
  const normalizedTagName = normalizeTagName(tagName);

  return axis.dbTagNames.some(name => normalizeTagName(name) === normalizedTagName);
}

function normalizeTagName(tagName: string): string {
  return tagName
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPatternsForTagType(axis: RackBalanceAxisDefinition, tagType: string | null): RegExp[] {
  if (tagType === 'purpose') {
    return axis.purposePatterns;
  }

  if (tagType === 'nature') {
    return axis.naturePatterns;
  }

  return [
    ...axis.purposePatterns,
    ...axis.naturePatterns
  ];
}

function exactMatchWeight(tagType: string | null): number {
  if (tagType === 'purpose') {
    return 6;
  }

  if (tagType === 'nature') {
    return 4;
  }

  return 3;
}

function patternMatchWeight(tagType: string | null): number {
  if (tagType === 'purpose') {
    return 4;
  }

  if (tagType === 'nature') {
    return 2;
  }

  return 1;
}
