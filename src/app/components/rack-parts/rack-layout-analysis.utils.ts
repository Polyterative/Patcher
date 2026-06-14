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

  const modules = rows
    .flat()
    .filter(module => !isBlankModule(module.module.id))
    .filter(module => isInScope(module, scope));
  const autoArrangeMoves = firstFitDecreasing(modules, rackHp);
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

function firstFitDecreasing(modules: RackedModule[], rackHp: number): RackLayoutAutoArrangeMove[] {
  const rows: number[] = [];

  return [...modules]
    .sort((a, b) => (b.module.hp ?? 0) - (a.module.hp ?? 0))
    .map(module => {
      const hp = module.module.hp ?? 0;
      let targetRow = rows.findIndex(usedHp => usedHp + hp <= rackHp);
      if (targetRow < 0) {
        targetRow = rows.length;
        rows.push(0);
      }
      rows[targetRow] += hp;

      return {
        rackedModuleId: module.rackingData.id,
        moduleId: module.module.id,
        fromRow: module.rackingData.row,
        toRow: targetRow
      };
    });
}

function countGreedyArrangement(modules: RackedModule[], rackHp: number): number {
  return firstFitDecreasing(modules, rackHp).every(move => move.toRow >= 0) ? 1 : 0;
}

function moduleStandardId(module: RackedModule): number {
  const standard = module.module.standard;
  if (typeof standard === 'number') {
    return standard;
  }
  return standard?.id ?? 0;
}
