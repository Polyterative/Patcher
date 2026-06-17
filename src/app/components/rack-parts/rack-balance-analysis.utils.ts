import {
  isFunctionalTagType,
  normalizeTagName,
  normalizeTagType,
  type Tag,
} from 'src/app/models/tag';
import {
  RackBalanceAxisId,
  RACK_BALANCE_AXES
} from './rack-balance-analysis.constants';
import {
  RackBalanceAnalysisResult,
  RackBalanceAxisResult
} from './rack-balance-analysis.types';


export interface RackBalanceAxisDiff extends RackBalanceAxisResult {
  shareDiff: number;
  matchedModulesDiff: number;
}

export interface RackBalanceDiff {
  axes: RackBalanceAxisDiff[];
  summary: string;
  leftLabel: string;
  rightLabel: string;
}


export function resolveTagAxis(tagName: string | null | undefined): RackBalanceAxisId | null {
  const normalizedTagName = tagName?.trim();
  if (!normalizedTagName) {
    return null;
  }

  for (const axis of RACK_BALANCE_AXES) {
    if (axis.dbTagNames.some(name => normalizeTagName(name) === normalizeTagName(normalizedTagName))) {
      return axis.id;
    }

    if (axis.purposePatterns.some(pattern => pattern.test(normalizedTagName))) {
      return axis.id;
    }
  }

  return null;
}

export function resolveFunctionalTagAxis(tag: Pick<Tag, 'name' | 'type'> | null | undefined): RackBalanceAxisId | null {
  const tagType = normalizeTagType(tag?.type);
  if (tagType !== null && !isFunctionalTagType(tagType)) {
    return null;
  }

  return resolveTagAxis(tag?.name);
}

export function computeRackBalanceDiff(
  left: RackBalanceAnalysisResult,
  right: RackBalanceAnalysisResult,
  leftLabel = 'Rack A',
  rightLabel = 'Rack B'
): RackBalanceDiff {
  const rightAxesById = new Map<RackBalanceAxisId, RackBalanceAxisResult>(
    right.axes.map(axis => [axis.id, axis])
  );

  const axes = left.axes.map(leftAxis => {
    const rightAxis = rightAxesById.get(leftAxis.id);
    return {
      ...leftAxis,
      shareDiff: leftAxis.share - (rightAxis?.share ?? 0),
      matchedModulesDiff: leftAxis.matchedModules - (rightAxis?.matchedModules ?? 0)
    };
  });

  return {
    axes,
    summary: buildRackBalanceDiffSummary(axes, leftLabel, rightLabel),
    leftLabel,
    rightLabel
  };
}

export function buildRackBalanceDiffSummary(
  axes: RackBalanceAxisDiff[],
  leftLabel = 'Rack A',
  rightLabel = 'Rack B'
): string {
  const positive = axes
    .filter(axis => axis.shareDiff > 0)
    .sort((a, b) => b.shareDiff - a.shareDiff)
    .slice(0, 2);
  const negative = axes
    .filter(axis => axis.shareDiff < 0)
    .sort((a, b) => a.shareDiff - b.shareDiff)
    .slice(0, 2);

  if (positive.length === 0 && negative.length === 0) {
    return `${ leftLabel } and ${ rightLabel } have the same balance profile.`;
  }

  const clauses: string[] = [];
  if (positive.length > 0) {
    clauses.push(`${ leftLabel } has more ${ formatAxisDiffList(positive) }`);
  }
  if (negative.length > 0) {
    clauses.push(`${ rightLabel } has more ${ formatAxisDiffList(negative.map(axis => ({
      ...axis,
      shareDiff: Math.abs(axis.shareDiff)
    }))) }`);
  }

  return `${ clauses.join(' while ') }.`;
}

function formatAxisDiffList(axes: RackBalanceAxisDiff[]): string {
  return axes
    .map(axis => `${ axis.label } (+${ axis.shareDiff } pts)`)
    .join(' and ');
}
