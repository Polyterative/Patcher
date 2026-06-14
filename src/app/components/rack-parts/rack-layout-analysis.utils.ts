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
  toRow: number;
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

export function computeLayoutAnalysis(
  rowedModules: RackedModule[][] | null | undefined,
  rackHp: number,
  scope: RackLayoutScope = 'all'
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
    group.rowIndexes
  ));
  const hasOverflow = overflowHp.some(value => value > 0);

  return {
    isValid: !hasOverflow,
    mixedRowIssues,
    wastedHp,
    overflowHp,
    autoArrangeMoves,
    validArrangementCount: modules.length <= 20 ? countGreedyArrangement(modules, rackHp) : 'estimated',
    ...(modules.length > 20 ? {estimate: countGreedyArrangement(modules.slice(0, 20), rackHp)} : {})
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
  targetRowIndexes: number[]
): RackLayoutAutoArrangeMove[] {
  const bins = targetRowIndexes.length > 0
    ? targetRowIndexes.map(rowIndex => ({rowIndex, usedHp: 0}))
    : [{rowIndex: 0, usedHp: 0}];
  let nextSyntheticRowIndex = Math.max(...bins.map(row => row.rowIndex), -1) + 1;

  return [...modules]
    .sort((a, b) => (b.module.hp ?? 0) - (a.module.hp ?? 0))
    .map(module => {
      const hp = module.module.hp ?? 0;
      let targetBin = bins.find(row => row.usedHp + hp <= rackHp);
      if (!targetBin) {
        targetBin = {
          rowIndex: nextSyntheticRowIndex,
          usedHp: 0
        };
        nextSyntheticRowIndex += 1;
        bins.push(targetBin);
      }
      targetBin.usedHp += hp;

      return {
        rackedModuleId: module.rackingData.id,
        moduleId: module.module.id,
        fromRow: module.rackingData.row,
        toRow: targetBin.rowIndex
      };
    });
}

function countGreedyArrangement(modules: RackedModule[], rackHp: number): number {
  return firstFitDecreasing(modules, rackHp, []).every(move => move.toRow >= 0) ? 1 : 0;
}

function moduleStandardId(module: RackedModule): number {
  const standard = module.module.standard;
  if (typeof standard === 'number') {
    return standard;
  }
  return standard?.id ?? 0;
}
