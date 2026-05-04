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

export interface FunctionAnalysisLegendItem {
  label: string;
  swatchClass: string;
}

export interface FunctionAnalysisLegendSummaryItem extends FunctionAnalysisLegendItem {
  count: number;
  hp: number;
}

export interface RowFunctionRoleBreakdown {
  label: string;
  className: string;
  moduleCount: number;
  hp: number;
}

export interface RowFunctionBreakdown {
  moduleCount: number;
  roles: RowFunctionRoleBreakdown[];
  residualCount: number;
  residualHp: number;
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

export const FUNCTION_ANALYSIS_LEGEND: ReadonlyArray<FunctionAnalysisLegendItem> = [
  {label: 'Voices', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--voices'},
  {label: 'Modulation', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--modulation'},
  {label: 'Utilities', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--utilities'},
  {label: 'Timing', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--timing'},
  {label: 'Tone shaping', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--tone'},
];

const TRACKED_FUNCTION_ROLE_CLASS_NAMES = new Set<string>(Object.values(FUNCTION_AXIS_CLASS_NAMES));
const TRACKED_FUNCTION_ROLE_LABELS = new Set<string>(FUNCTION_ANALYSIS_LEGEND.map(item => item.label));

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

/** Returns whether a module analysis class maps to one of the tracked function roles. */
export function isTrackedFunctionRole(className: string): boolean {
  return TRACKED_FUNCTION_ROLE_CLASS_NAMES.has(className);
}

/** Aggregates tracked function roles across the full rack for the editor legend. */
export function buildFunctionAnalysisLegendItems(
  rowedRackedModules: RackedModule[][] | null | undefined
): FunctionAnalysisLegendSummaryItem[] {
  const counts = new Map(FUNCTION_ANALYSIS_LEGEND.map(item => [item.label, {
    count: 0,
    hp: 0
  }]));

  for (const rackedModule of flattenRowedModules(rowedRackedModules)) {
    const roleLabel = buildRackFunctionVisual(rackedModule).roleLabel;
    const current = counts.get(roleLabel);
    if (!current) {
      continue;
    }

    current.count += 1;
    current.hp += rackedModule.module.hp ?? 0;
  }

  return FUNCTION_ANALYSIS_LEGEND.map(item => ({
    ...item,
    count: counts.get(item.label)?.count ?? 0,
    hp: counts.get(item.label)?.hp ?? 0
  }));
}

/** Summarizes blank and unclassified modules that fall outside the tracked legend. */
export function buildFunctionAnalysisResidualLabel(
  rowedRackedModules: RackedModule[][] | null | undefined
): string | null {
  const residual = buildResidualTotals(flattenRowedModules(rowedRackedModules));
  return residual.count > 0 ? `${ residual.count } blank or unclassified (${ residual.hp }HP)` : null;
}

/** Builds the tracked-role coverage copy shown in the editor analysis panel. */
export function buildFunctionAnalysisCoverageSummary(
  rowedRackedModules: RackedModule[][] | null | undefined
): string {
  const modules = flattenRowedModules(rowedRackedModules);

  if (modules.length === 0) {
    return 'No modules to classify yet.';
  }

  let totalHp = 0;
  let classifiedCount = 0;
  let classifiedHp = 0;

  for (const rackedModule of modules) {
    const hp = rackedModule.module.hp ?? 0;
    totalHp += hp;

    if (!isTrackedFunctionLabel(buildRackFunctionVisual(rackedModule).roleLabel)) {
      continue;
    }

    classifiedCount += 1;
    classifiedHp += hp;
  }

  return `Tracked ${ classifiedCount }/${ modules.length } modules · ${ classifiedHp }/${ totalHp }HP`;
}

/** Groups row modules by tracked function role so row overlays can render cached summaries. */
export function buildRowFunctionBreakdowns(
  rowedRackedModules: RackedModule[][] | null | undefined
): Map<number, RowFunctionBreakdown> {
  const breakdowns = new Map<number, RowFunctionBreakdown>();

  for (const [rowId, rowModules] of (rowedRackedModules ?? []).entries()) {
    if (rowModules.length === 0) {
      continue;
    }

    const roleMap = new Map<string, RowFunctionRoleBreakdown>();
    let residualCount = 0;
    let residualHp = 0;

    for (const rackedModule of rowModules) {
      const functionVisual = buildRackFunctionVisual(rackedModule);
      const hp = rackedModule.module.hp ?? 0;

      if (!isTrackedFunctionRole(functionVisual.className)) {
        residualCount += 1;
        residualHp += hp;
        continue;
      }

      const current = roleMap.get(functionVisual.roleLabel) ?? {
        label: functionVisual.roleLabel,
        className: functionVisual.className,
        moduleCount: 0,
        hp: 0
      };

      current.moduleCount += 1;
      current.hp += hp;
      roleMap.set(functionVisual.roleLabel, current);
    }

    breakdowns.set(rowId, {
      moduleCount: rowModules.length,
      roles: [...roleMap.values()].sort(sortRoleBreakdowns),
      residualCount,
      residualHp
    });
  }

  return breakdowns;
}

/** Builds the row-level residual copy for function-analysis overlays. */
export function buildRowFunctionResidualLabel(rowFunction: RowFunctionBreakdown | null): string {
  if (!rowFunction) {
    return '';
  }

  if (rowFunction.roles.length === 0) {
    return rowFunction.residualCount > 0
      ? `${ rowFunction.residualCount } module${ rowFunction.residualCount === 1 ? '' : 's' } blank or unclassified in this row`
      : 'No tracked function roles recognized in this row yet.';
  }

  return rowFunction.residualCount > 0
    ? `${ rowFunction.residualCount } module${ rowFunction.residualCount === 1 ? '' : 's' } blank or unclassified (${ rowFunction.residualHp }HP)`
    : 'All modules in this row map to tracked function roles.';
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

function flattenRowedModules(rowedRackedModules: RackedModule[][] | null | undefined): RackedModule[] {
  return (rowedRackedModules ?? []).flat();
}

function buildResidualTotals(rackedModules: RackedModule[]): {count: number; hp: number} {
  let count = 0;
  let hp = 0;

  for (const rackedModule of rackedModules) {
    if (isTrackedFunctionLabel(buildRackFunctionVisual(rackedModule).roleLabel)) {
      continue;
    }

    count += 1;
    hp += rackedModule.module.hp ?? 0;
  }

  return {count, hp};
}

function isTrackedFunctionLabel(roleLabel: string): boolean {
  return TRACKED_FUNCTION_ROLE_LABELS.has(roleLabel);
}

function sortRoleBreakdowns(a: RowFunctionRoleBreakdown, b: RowFunctionRoleBreakdown): number {
  return b.hp - a.hp || b.moduleCount - a.moduleCount || a.label.localeCompare(b.label);
}
