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
  validArrangementCount: number | 'estimated';
  estimate?: number;
}

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
  const usedHpByRow = rows.map(row => row.reduce((sum, module) => sum + (module.module.hp ?? 0), 0));
  const overflowHp = usedHpByRow.map(usedHp => Math.max(usedHp - rackHp, 0));
  const wastedHp = usedHpByRow.map(usedHp => Math.max(rackHp - usedHp, 0));

  if (mixedRowIssues.length > 0) {
    return {
      isValid: false,
      mixedRowIssues,
      wastedHp,
      overflowHp,
      autoArrangeMoves: [],
      validArrangementCount: 0
    };
  }

  const modules = scopedModules(rows, scope);
  const formatGroups = buildFormatGroups(rows, modules, scope);
  const autoArrangeMoves = formatGroups.flatMap(group => firstFitDecreasing(
    group.modules,
    rackHp,
    group.rowIndexes,
    options.variant ?? 0
  ));
  const canCountExactly = formatGroups.every(group => shouldCountExactly(group));
  const arrangementCount = canCountExactly
    ? formatGroups.reduce(
      (product, group) => product * countExactArrangements(group.modules, rackHp, group.rowIndexes.length),
      1
    )
    : 'estimated';
  const hasOverflow = overflowHp.some(value => value > 0);

  return {
    isValid: !hasOverflow,
    mixedRowIssues,
    wastedHp,
    overflowHp,
    autoArrangeMoves,
    validArrangementCount: arrangementCount,
    ...(!canCountExactly ? {
      estimate: formatGroups.reduce(
        (product, group) => product * countEstimatedArrangements(group.modules, rackHp, group.rowIndexes.length),
        1
      )
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
      const hp = module.module.hp ?? 0;
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

function countExactArrangements(modules: RackedModule[], rackHp: number, rowCount: number): number {
  const targetRowCount = Math.max(1, rowCount);
  const moduleHp = modules
    .map(module => module.module.hp ?? 0)
    .sort((left, right) => right - left);
  const memo = new Map<string, number>();

  const countFrom = (moduleIndex: number, remainingHpByRow: number[]): number => {
    if (moduleIndex >= moduleHp.length) {
      return 1;
    }

    const memoKey = `${ moduleIndex }|${ remainingHpByRow.join(',') }`;
    const memoized = memo.get(memoKey);
    if (memoized != null) {
      return memoized;
    }

    const hp = moduleHp[moduleIndex];
    let count = 0;
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

function countEstimatedArrangements(modules: RackedModule[], rackHp: number, rowCount: number): number {
  const targetRowCount = Math.max(1, rowCount);
  if (modules.length === 0) {
    return 1;
  }
  if (!canGreedyFit(modules, rackHp, targetRowCount)) {
    return 0;
  }

  const moduleHp = modules.map(module => module.module.hp ?? 0);
  const totalAssignments = Math.pow(targetRowCount, moduleHp.length);
  const sampleCount = Math.min(ESTIMATED_ARRANGEMENT_SAMPLE_COUNT, totalAssignments);
  let validSamples = 0;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
    let seed = sampleIndex + 1;
    const remainingHpByRow = Array.from({length: targetRowCount}, () => rackHp);
    let isValidSample = true;

    for (const hp of moduleHp) {
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

  const estimate = Math.round((validSamples / sampleCount) * totalAssignments);
  return Math.max(1, estimate);
}

function canGreedyFit(modules: RackedModule[], rackHp: number, rowCount: number): boolean {
  const remainingHpByRow = Array.from({length: rowCount}, () => rackHp);
  const moduleHp = modules
    .map(module => module.module.hp ?? 0)
    .sort((left, right) => right - left);

  return moduleHp.every(hp => {
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
    const hpDiff = (b.module.hp ?? 0) - (a.module.hp ?? 0);
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

function moduleStandardId(module: RackedModule): number {
  const standard = module.module.standard;
  if (typeof standard === 'number') {
    return standard;
  }
  return standard?.id ?? 0;
}
