import { MinimalModule } from 'src/app/models/module';
import { STANDARDS } from './module-collection-analysis.constants';
import {
  RackAnalysis,
  StandardAnalysis
} from './module-collection-analysis.models';


const STANDARD_NAMES: Readonly<Record<number, string>> = Object.fromEntries(
  Object.values(STANDARDS).map(s => [s.id, s.name])
);

export function getStandardName(standardId: number): string {
  return STANDARD_NAMES[standardId] ?? 'Unknown';
}

export function filterModulesByStandard(
  modules: MinimalModule[] | null | undefined,
  standardIds: number | number[]
): MinimalModule[] {
  const validModules = modules || [];
  const idsArray = Array.isArray(standardIds) ? standardIds : [standardIds];

  return validModules.filter(m => {
    if (!m) return false;
    const moduleStandardId = m.standard?.id ?? STANDARDS.EURORACK_3U.id;
    return idsArray.includes(moduleStandardId);
  });
}

export function calculateRequiredRows(modules: MinimalModule[], hpPerRow: number): number {
  if (modules.length === 0 || hpPerRow <= 0) {
    return 0;
  }

  const validModules = modules.filter(m => m && typeof m.hp === 'number' && m.hp > 0);

  if (validModules.length === 0) {
    return 0;
  }

  const sortedModules = [...validModules].sort((a, b) => (b.hp || 0) - (a.hp || 0));

  const rows: number[] = [];

  for (const module of sortedModules) {
    const moduleHp = module.hp || 0;

    if (moduleHp <= 0 || moduleHp > hpPerRow) {
      continue;
    }

    let placed = false;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] + moduleHp <= hpPerRow) {
        rows[i] += moduleHp;
        placed = true;
        break;
      }
    }

    if (!placed) {
      rows.push(moduleHp);
    }
  }

  return rows.length;
}

export function groupModulesByStandard(modules: MinimalModule[]): Map<number, MinimalModule[]> {
  return modules
    .filter((m): m is MinimalModule => !!m)
    .reduce((map, module) => {
      const standardId = module.standard?.id ?? STANDARDS.EURORACK_3U.id;
      const list = map.get(standardId) ?? [];
      list.push(module);
      return map.set(standardId, list);
    }, new Map<number, MinimalModule[]>());
}

export function buildStandardAnalysis(
  standardModules: MinimalModule[],
  standardId: number,
  rowHp?: number
): StandardAnalysis | null {
  if (standardModules.length === 0) return null;

  const moduleHpValues = standardModules
    .filter(m => m && typeof m.hp === 'number' && m.hp > 0)
    .map(m => m.hp);

  if (moduleHpValues.length === 0) return null;

  const largestModuleHp = Math.max(...moduleHpValues);
  const totalModulesHp = moduleHpValues.reduce((sum, hp) => sum + hp, 0);
  const canFitLargest = rowHp !== undefined ? rowHp >= largestModuleHp : true;

  return {
    standardId,
    standardName: getStandardName(standardId),
    moduleCount: moduleHpValues.length,
    largestModuleHp,
    totalModulesHp,
    canFitLargest
  };
}

export function performStandardAnalysis(modules: MinimalModule[], rowHp?: number): StandardAnalysis[] {
  return Array.from(groupModulesByStandard(modules).entries())
    .map(([standardId, standardModules]) => buildStandardAnalysis(standardModules, standardId, rowHp))
    .filter((analysis): analysis is StandardAnalysis => analysis !== null)
    .sort((a, b) => b.moduleCount - a.moduleCount);
}

export function analyzeRackConfiguration(
  hp: number,
  rows: number,
  modules: MinimalModule[] | null | undefined
): RackAnalysis {
  const validHp = Number(hp) || 84;
  const validRows = Number(rows) || 2;
  const validModules = modules || [];

  const totalCapacity = validHp * validRows;

  if (validModules.length === 0) {
    return {
      totalCapacity,
      moduleCount: 0,
      totalModulesHp: 0,
      utilizationPercent: 0,
      recommendation: 'Standard eurorack configuration',
      warningMessage: undefined,
      standardAnalyses: [],
      primaryStandard: undefined
    };
  }

  const standardAnalyses = performStandardAnalysis(validModules, validHp);
  const primaryStandard = standardAnalyses.length > 0 ? standardAnalyses[0] : undefined;
  const totalModulesHp = standardAnalyses.reduce((sum, std) => sum + std.totalModulesHp, 0);
  const moduleCount = standardAnalyses.reduce((sum, std) => sum + std.moduleCount, 0);
  const utilizationPercent = totalCapacity > 0 ? (totalModulesHp / totalCapacity) * 100 : 0;
  const actualRowsNeeded = calculateRequiredRows(validModules, validHp);
  const modulesFit = actualRowsNeeded <= validRows;

  let recommendation: string;
  let warningMessage: string | undefined = undefined;

  const problematicStandards = standardAnalyses.filter(std => !std.canFitLargest);
  const moduleLabel = moduleCount === 1 ? 'module' : 'modules';

  if (problematicStandards.length > 0) {
    const largestHp = Math.max(...problematicStandards.map(s => s.largestModuleHp));
    warningMessage = `⚠️ Some modules won't fit: largest is ${ largestHp } HP, rows are ${ validHp } HP`;
    recommendation = `You'd need at least ${ largestHp } HP per row to fit all modules`;
  } else if (!modulesFit) {
    recommendation = `You'd need ${ actualRowsNeeded } rows to fit all ${ moduleCount } ${ moduleLabel }`;
  } else if (actualRowsNeeded === validRows) {
    recommendation = `Perfect fit for your ${ moduleCount } ${ moduleLabel }`;
  } else if (utilizationPercent > 80) {
    recommendation = `Perfect fit for most of your ${ moduleCount } ${ moduleLabel }`;
  } else if (utilizationPercent > 50) {
    recommendation = `Comfortable fit for your ${ moduleCount } ${ moduleLabel }`;
  } else {
    recommendation = `Plenty of room for your ${ moduleCount } ${ moduleLabel }`;
  }

  return {
    totalCapacity,
    moduleCount,
    totalModulesHp,
    utilizationPercent,
    recommendation,
    warningMessage,
    standardAnalyses,
    primaryStandard
  };
}

export function analyzeModuleCollection(modules: MinimalModule[] | null | undefined): StandardAnalysis[] {
  const validModules = modules || [];

  if (validModules.length === 0) {
    return [];
  }

  return performStandardAnalysis(validModules);
}

export function suggestRackDimensions(modules: MinimalModule[] | null | undefined): { hp: number; rows: number } {
  const validModules = modules || [];

  if (validModules.length === 0) {
    return {hp: 84, rows: 2};
  }

  const standardAnalyses = analyzeModuleCollection(validModules);

  if (standardAnalyses.length === 0) {
    return {hp: 84, rows: 2};
  }

  const primaryStandard = standardAnalyses[0];
  const largestModuleHp = primaryStandard.largestModuleHp;
  const commonSizes = [42, 62, 84, 104, 126, 168, 208];
  const suggestedHp = commonSizes.find(size => size >= largestModuleHp) || 84;
  const minRows = calculateRequiredRows(validModules, suggestedHp);
  const suggestedRows = Math.min(10, Math.max(minRows + 1, Math.ceil(minRows * 1.2)));

  return {hp: suggestedHp, rows: suggestedRows};
}
