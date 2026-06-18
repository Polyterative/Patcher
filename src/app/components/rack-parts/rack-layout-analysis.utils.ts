import { RackedModule } from 'src/app/models/module';
import { isBlankModule } from './rack-blank-module.constants';


export type RackLayoutScope = 'all' | '3u' | '1u' | { rowIndex: number };

export interface RackLayoutMixedRowIssue {
  rowIndex: number;
  standards: number[];
}

export interface RackLayoutAutoArrangeMove {
  rackedModuleId: number | undefined;
  moduleId: number;
  fromRow: number | null;
  fromColumn: number | null;
  toRow: number;
  toColumn: number;
}

export interface RackLayoutAnalysisResult {
  isValid: boolean;
  mixedRowIssues: RackLayoutMixedRowIssue[];
  wastedHp: number[];
  overflowHp: number[];
  autoArrangeMoves: RackLayoutAutoArrangeMove[];
  arrangementCount: RackArrangementCount;
  validArrangementCount: number | 'estimated' | 'capped';
  estimate?: number;
}

export type RackArrangementCount =
  | { kind: 'exact'; value: number }
  | { kind: 'sampled'; value: number }
  | { kind: 'capped'; source: 'exact' | 'sampled'; orderOfMagnitude: number }
  | { kind: 'impossible'; value: 0 };

interface RackLayoutFormatGroup {
  modules: RackedModule[];
  rowIndexes: number[];
}

interface RackLayoutBin {
  rowIndex: number;
  usedHp: number;
  moduleCount: number;
}

const MAX_EXACT_ARRANGEMENT_STATES = 100_000;
const ESTIMATED_ARRANGEMENT_SAMPLE_COUNT = 1024;
export const RACK_ARRANGEMENT_DISPLAY_SAFE_INTEGER_CAP = Number.MAX_SAFE_INTEGER;
const RACK_ARRANGEMENT_DISPLAY_SAFE_INTEGER_CAP_LOG10 = Math.log10(RACK_ARRANGEMENT_DISPLAY_SAFE_INTEGER_CAP);

export interface RackLayoutAnalysisOptions {
  variant?: number;
}

export function computeLayoutAnalysis(
  rowedModules: RackedModule[][] | null | undefined,
  rackHp: number,
  scope: RackLayoutScope = 'all',
  options: RackLayoutAnalysisOptions = {}
): RackLayoutAnalysisResult {
  const rows = rowedModules ?? [];
  const mixedRowIssues = findMixedRowIssues(rows);
  const safeRackHp = nonNegativeHp(rackHp);
  const usedHpByRow = rows.map(row => row.reduce((sum, module) => sum + moduleHp(module), 0));
  const overflowHp = usedHpByRow.map(usedHp => Math.max(usedHp - safeRackHp, 0));
  const wastedHp = usedHpByRow.map(usedHp => Math.max(safeRackHp - usedHp, 0));

  if (mixedRowIssues.length > 0) {
    return {
      isValid: false,
      mixedRowIssues,
      wastedHp,
      overflowHp,
      autoArrangeMoves: [],
      arrangementCount: {kind: 'impossible', value: 0},
      validArrangementCount: 0
    };
  }

  const modules = scopedModules(rows, scope);
  const formatGroups = buildFormatGroups(rows, modules, scope);
  const autoArrangeMoves = formatGroups.flatMap(group => firstFitDecreasing(
    group.modules,
    safeRackHp,
    group.rowIndexes,
    options.variant ?? 0
  ));
  const canCountExactly = formatGroups.every(group => shouldCountExactly(group));
  const arrangementCount = canCountExactly
    ? buildExactArrangementCount(formatGroups, safeRackHp)
    : buildEstimatedArrangementCount(formatGroups, safeRackHp);
  const hasOverflow = overflowHp.some(value => value > 0);

  return {
    isValid: !hasOverflow,
    mixedRowIssues,
    wastedHp,
    overflowHp,
    autoArrangeMoves,
    arrangementCount,
    validArrangementCount: legacyArrangementCount(arrangementCount),
    ...(arrangementCount.kind === 'sampled' ? {
      estimate: arrangementCount.value
    } : {})
  };
}

function findMixedRowIssues(rows: RackedModule[][]): RackLayoutMixedRowIssue[] {
  return rows
    .map((row, rowIndex) => ({
      rowIndex,
      standards: [...new Set(
        row
          .filter(module => !isBlankModule(module.module.id))
          .map(module => moduleStandardId(module))
      )].sort((a, b) => a - b)
    }))
    .filter(issue => issue.standards.length > 1);
}

function isInScope(module: RackedModule, scope: RackLayoutScope): boolean {
  if (scope === 'all') {
    return true;
  }
  if (scope === '3u') {
    return moduleStandardId(module) === 0;
  }
  if (scope === '1u') {
    return moduleStandardId(module) === 1 || moduleStandardId(module) === 2;
  }
  return module.rackingData.row === scope.rowIndex;
}

function scopedModules(rows: RackedModule[][], scope: RackLayoutScope): RackedModule[] {
  return rows
    .flat()
    .filter(module => !isBlankModule(module.module.id))
    .filter(module => isInScope(module, scope));
}

function buildFormatGroups(
  rows: RackedModule[][],
  modules: RackedModule[],
  scope: RackLayoutScope
): RackLayoutFormatGroup[] {
  if (typeof scope === 'object') {
    return [{
      modules,
      rowIndexes: [scope.rowIndex]
    }];
  }

  const modulesByStandard = new Map<number, RackedModule[]>();
  modules.forEach(module => {
    const standardId = moduleStandardId(module);
    modulesByStandard.set(standardId, [...(modulesByStandard.get(standardId) ?? []), module]);
  });

  return Array.from(modulesByStandard.entries())
    .sort(([leftStandard], [rightStandard]) => leftStandard - rightStandard)
    .map(([standardId, groupModules]) => ({
      modules: groupModules,
      rowIndexes: rowIndexesForStandard(rows, standardId)
    }));
}

function rowIndexesForStandard(rows: RackedModule[][], standardId: number): number[] {
  return rows
    .map((row, rowIndex) => ({
      rowIndex,
      hasMatchingStandard: row
        .filter(module => !isBlankModule(module.module.id))
        .some(module => moduleStandardId(module) === standardId)
    }))
    .filter(row => row.hasMatchingStandard)
    .map(row => row.rowIndex);
}

function firstFitDecreasing(
  modules: RackedModule[],
  rackHp: number,
  targetRowIndexes: number[],
  variant = 0
): RackLayoutAutoArrangeMove[] {
  const bins: RackLayoutBin[] = targetRowIndexes.length > 0
    ? targetRowIndexes.map(rowIndex => ({rowIndex, usedHp: 0, moduleCount: 0}))
    : [{rowIndex: 0, usedHp: 0, moduleCount: 0}];
  let nextSyntheticRowIndex = Math.max(...bins.map(row => row.rowIndex), -1) + 1;

  return orderModulesForVariant(modules, variant)
    .map(module => {
      const hp = moduleHp(module);
      let targetBin = bins.find(row => row.usedHp + hp <= rackHp);
      if (!targetBin) {
        targetBin = {
          rowIndex: nextSyntheticRowIndex,
          usedHp: 0,
          moduleCount: 0
        };
        nextSyntheticRowIndex += 1;
        bins.push(targetBin);
      }
      targetBin.usedHp += hp;
      const toColumn = targetBin.moduleCount ?? 0;
      targetBin.moduleCount = toColumn + 1;

      return {
        rackedModuleId: module.rackingData.id,
        moduleId: module.module.id,
        fromRow: module.rackingData.row,
        fromColumn: module.rackingData.column,
        toRow: targetBin.rowIndex,
        toColumn
      };
    });
}

function buildExactArrangementCount(formatGroups: RackLayoutFormatGroup[], rackHp: number): RackArrangementCount {
  const count = formatGroups.reduce(
    (product, group) => product * countExactArrangements(group.modules, rackHp, group.rowIndexes.length),
    1n
  );

  return bigintToArrangementCount(count, 'exact');
}

function countExactArrangements(modules: RackedModule[], rackHp: number, rowCount: number): bigint {
  const targetRowCount = Math.max(1, rowCount);
  const moduleHpValues = modules
    .map(module => moduleHp(module))
    .sort((left, right) => right - left);
  const memo = new Map<string, bigint>();

  const countFrom = (moduleIndex: number, remainingHpByRow: number[]): bigint => {
    if (moduleIndex >= moduleHpValues.length) {
      return 1n;
    }

    const memoKey = `${ moduleIndex }|${ remainingHpByRow.join(',') }`;
    const memoized = memo.get(memoKey);
    if (memoized != null) {
      return memoized;
    }

    const hp = moduleHpValues[moduleIndex];
    let count = 0n;
    for (let rowIndex = 0; rowIndex < remainingHpByRow.length; rowIndex++) {
      if (remainingHpByRow[rowIndex] < hp) {
        continue;
      }
      const nextRemaining = [...remainingHpByRow];
      nextRemaining[rowIndex] -= hp;
      count += countFrom(moduleIndex + 1, nextRemaining);
    }

    memo.set(memoKey, count);
    return count;
  };

  return countFrom(0, Array.from({length: targetRowCount}, () => rackHp));
}

function shouldCountExactly(group: RackLayoutFormatGroup): boolean {
  return group.modules.length <= 20
    && estimateExactArrangementStates(group.modules.length, Math.max(1, group.rowIndexes.length))
    <= MAX_EXACT_ARRANGEMENT_STATES;
}

function estimateExactArrangementStates(moduleCount: number, rowCount: number): number {
  let states = 1;
  const total = moduleCount + rowCount;
  const choose = Math.min(rowCount, moduleCount);
  for (let step = 1; step <= choose; step++) {
    states = states * (total - choose + step) / step;
    if (states > MAX_EXACT_ARRANGEMENT_STATES) {
      return Infinity;
    }
  }
  return states;
}

interface RackEstimatedArrangementCount {
  value: number;
  log10: number;
  isCapped: boolean;
}

function buildEstimatedArrangementCount(formatGroups: RackLayoutFormatGroup[], rackHp: number): RackArrangementCount {
  const counts = formatGroups.map(group =>
    countEstimatedArrangements(group.modules, rackHp, group.rowIndexes.length)
  );
  if (counts.some(count => count.value === 0)) {
    return {kind: 'impossible', value: 0};
  }

  const log10 = counts.reduce((sum, count) => sum + count.log10, 0);
  if (!Number.isFinite(log10) || log10 > RACK_ARRANGEMENT_DISPLAY_SAFE_INTEGER_CAP_LOG10) {
    return {
      kind: 'capped',
      source: 'sampled',
      orderOfMagnitude: safeOrderOfMagnitude(log10)
    };
  }

  const value = counts.reduce((product, count) => product * count.value, 1);
  if (!Number.isSafeInteger(value) || value < 0 || counts.some(count => count.isCapped)) {
    return {
      kind: 'capped',
      source: 'sampled',
      orderOfMagnitude: safeOrderOfMagnitude(log10)
    };
  }

  return {kind: 'sampled', value};
}

function countEstimatedArrangements(modules: RackedModule[], rackHp: number, rowCount: number): RackEstimatedArrangementCount {
  const targetRowCount = Math.max(1, rowCount);
  if (modules.length === 0) {
    return {value: 1, log10: 0, isCapped: false};
  }
  if (!canGreedyFit(modules, rackHp, targetRowCount)) {
    return {value: 0, log10: -Infinity, isCapped: false};
  }

  const moduleHpValues = modules.map(module => moduleHp(module));
  const totalAssignmentsLog10 = moduleHpValues.length * Math.log10(targetRowCount);
  const totalAssignments = totalAssignmentsLog10 <= RACK_ARRANGEMENT_DISPLAY_SAFE_INTEGER_CAP_LOG10
    ? Math.pow(targetRowCount, moduleHpValues.length)
    : Infinity;
  const sampleCount = Math.min(ESTIMATED_ARRANGEMENT_SAMPLE_COUNT, totalAssignments);
  let validSamples = 0;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
    let seed = sampleIndex + 1;
    const remainingHpByRow = Array.from({length: targetRowCount}, () => rackHp);
    let isValidSample = true;

    for (const hp of moduleHpValues) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const rowIndex = seed % targetRowCount;
      remainingHpByRow[rowIndex] -= hp;
      if (remainingHpByRow[rowIndex] < 0) {
        isValidSample = false;
        break;
      }
    }

    if (isValidSample) {
      validSamples += 1;
    }
  }

  const validRatio = validSamples / sampleCount;
  if (validRatio <= 0) {
    return {value: 1, log10: 0, isCapped: false};
  }

  const estimateLog10 = Math.log10(validRatio) + totalAssignmentsLog10;
  if (!Number.isFinite(estimateLog10) || estimateLog10 > RACK_ARRANGEMENT_DISPLAY_SAFE_INTEGER_CAP_LOG10) {
    return {
      value: RACK_ARRANGEMENT_DISPLAY_SAFE_INTEGER_CAP,
      log10: estimateLog10,
      isCapped: true
    };
  }

  const estimate = Math.round(validRatio * Math.pow(10, totalAssignmentsLog10));
  return {
    value: clampArrangementCount(estimate, 1),
    log10: estimateLog10,
    isCapped: false
  };
}

function canGreedyFit(modules: RackedModule[], rackHp: number, rowCount: number): boolean {
  const remainingHpByRow = Array.from({length: rowCount}, () => rackHp);
  const moduleHpValues = modules
    .map(module => moduleHp(module))
    .sort((left, right) => right - left);

  return moduleHpValues.every(hp => {
    const rowIndex = remainingHpByRow.findIndex(remainingHp => remainingHp >= hp);
    if (rowIndex < 0) {
      return false;
    }
    remainingHpByRow[rowIndex] -= hp;
    return true;
  });
}

function orderModulesForVariant(modules: RackedModule[], variant: number): RackedModule[] {
  const ordered = [...modules].sort((a, b) => {
    const hpDiff = moduleHp(b) - moduleHp(a);
    if (hpDiff !== 0) {
      return hpDiff;
    }

    return (a.rackingData.column ?? 0) - (b.rackingData.column ?? 0);
  });
  const mode = Math.abs(variant) % 3;

  if (mode === 1) {
    return [...ordered].reverse();
  }

  if (mode === 2 && ordered.length > 1) {
    const offset = Math.abs(variant) % ordered.length;
    return [...ordered.slice(offset), ...ordered.slice(0, offset)];
  }

  return ordered;
}

function legacyArrangementCount(count: RackArrangementCount): number | 'estimated' | 'capped' {
  if (count.kind === 'exact') {
    return count.value;
  }
  if (count.kind === 'impossible') {
    return 0;
  }
  if (count.kind === 'sampled') {
    return 'estimated';
  }
  return 'capped';
}

function bigintToArrangementCount(count: bigint, source: 'exact' | 'sampled'): RackArrangementCount {
  if (count <= 0n) {
    return {kind: 'impossible', value: 0};
  }

  if (count <= BigInt(RACK_ARRANGEMENT_DISPLAY_SAFE_INTEGER_CAP)) {
    return {
      kind: source === 'exact' ? 'exact' : 'sampled',
      value: Number(count)
    };
  }

  return {
    kind: 'capped',
    source,
    orderOfMagnitude: count.toString().length - 1
  };
}

function clampArrangementCount(value: number, minimum = 0): number {
  if (!Number.isFinite(value) || value < minimum) {
    return minimum;
  }
  return Math.min(Math.round(value), RACK_ARRANGEMENT_DISPLAY_SAFE_INTEGER_CAP);
}

function safeOrderOfMagnitude(log10: number): number {
  if (!Number.isFinite(log10) || log10 < 0) {
    return 0;
  }
  return Math.floor(log10);
}

function moduleHp(module: RackedModule): number {
  return nonNegativeHp(module.module.hp ?? 0);
}

function nonNegativeHp(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
}

function moduleStandardId(module: RackedModule): number {
  const standard = module.module.standard;
  if (typeof standard === 'number') {
    return standard;
  }
  return standard?.id ?? 0;
}
