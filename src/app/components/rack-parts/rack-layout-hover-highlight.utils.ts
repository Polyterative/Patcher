import { RackedModule } from 'src/app/models/module';
import { isBlankModule } from './rack-blank-module.constants';


export interface RackLayoutHoverCombination {
  keys: Set<string>;
  label: string;
  moduleCount: number;
  totalHp: number;
}

export interface RackLayoutHoverCandidates {
  anchorKey: string;
  targetHp: number;
  exactMatchKeys: Set<string>;
  combinationGroups: RackLayoutHoverCombination[];
}

export interface RackLayoutHoverVisual {
  className: string;
  label: string;
}

interface RackLayoutHoverCandidateModule {
  key: string;
  hp: number;
  column: number;
  row: number;
}

const MAX_COMBINATION_GROUPS = 8;
const INACTIVE_VISUAL: RackLayoutHoverVisual = {
  className: 'layoutAnalysisModule--inactive',
  label: ''
};

export function buildRackLayoutHoverCandidates(
  rowedModules: RackedModule[][] | null | undefined,
  hoveredModule: RackedModule,
  keyForModule: (module: RackedModule) => string
): RackLayoutHoverCandidates {
  const anchorKey = keyForModule(hoveredModule);
  const targetHp = hoveredModule.module.hp ?? 0;
  const targetStandardId = moduleStandardId(hoveredModule);
  const modules = (rowedModules ?? []).flat()
    .filter(module => keyForModule(module) !== anchorKey)
    .filter(module => !isBlankModule(module.module.id))
    .filter(module => moduleStandardId(module) === targetStandardId);
  const exactMatchKeys = new Set(
    modules
      .filter(module => (module.module.hp ?? 0) === targetHp)
      .map(keyForModule)
  );
  const smallerCandidates = modules
    .filter(module => (module.module.hp ?? 0) > 0 && (module.module.hp ?? 0) < targetHp)
    .map(module => ({
      key: keyForModule(module),
      hp: module.module.hp ?? 0,
      row: module.rackingData.row ?? 0,
      column: module.rackingData.column ?? 0,
    }))
    .sort((left, right) => {
      const hpDiff = right.hp - left.hp;
      if (hpDiff !== 0) {
        return hpDiff;
      }

      const rowDiff = left.row - right.row;
      return rowDiff !== 0 ? rowDiff : left.column - right.column;
    });

  return {
    anchorKey,
    targetHp,
    exactMatchKeys,
    combinationGroups: findExactHpCombinationGroups(smallerCandidates, targetHp)
  };
}

export function buildRackLayoutHoverVisuals(
  rowedModules: RackedModule[][] | null | undefined,
  candidates: RackLayoutHoverCandidates,
  phaseIndex: number,
  keyForModule: (module: RackedModule) => string
): Map<string, RackLayoutHoverVisual> {
  const visualMap = new Map<string, RackLayoutHoverVisual>();
  (rowedModules ?? []).flat().forEach(module => {
    visualMap.set(keyForModule(module), INACTIVE_VISUAL);
  });

  visualMap.set(candidates.anchorKey, {
    className: 'layoutAnalysisModule--anchor',
    label: `${ candidates.targetHp }HP`
  });

  const phaseCount = 1 + candidates.combinationGroups.length;
  const normalizedPhaseIndex = phaseCount > 0 ? Math.abs(phaseIndex) % phaseCount : 0;

  if (normalizedPhaseIndex === 0) {
    candidates.exactMatchKeys.forEach(key => {
      visualMap.set(key, {
        className: 'layoutAnalysisModule--exact',
        label: `${ candidates.targetHp }HP match`
      });
    });
    return visualMap;
  }

  const combination = candidates.combinationGroups[normalizedPhaseIndex - 1];
  combination?.keys.forEach(key => {
    visualMap.set(key, {
      className: 'layoutAnalysisModule--combo',
      label: combination.label
    });
  });

  return visualMap;
}

export function rackLayoutHoverPhaseCount(candidates: RackLayoutHoverCandidates | null): number {
  return candidates ? 1 + candidates.combinationGroups.length : 0;
}

function findExactHpCombinationGroups(
  candidates: RackLayoutHoverCandidateModule[],
  targetHp: number
): RackLayoutHoverCombination[] {
  if (targetHp <= 1 || candidates.length === 0) {
    return [];
  }

  const combinationsBySum = new Map<number, RackLayoutHoverCandidateModule[][]>([[0, [[]]]]);
  const seenCombinationKeys = new Set<string>();

  candidates.forEach(candidate => {
    for (let sum = targetHp - candidate.hp; sum >= 0; sum -= 1) {
      const existingCombinations = combinationsBySum.get(sum);
      if (!existingCombinations || existingCombinations.length === 0) {
        continue;
      }

      const nextSum = sum + candidate.hp;
      const bucket = combinationsBySum.get(nextSum) ?? [];
      existingCombinations.forEach(existingCombination => {
        if (bucket.length >= MAX_COMBINATION_GROUPS) {
          return;
        }

        const nextCombination = [...existingCombination, candidate];
        const combinationKey = nextCombination
          .map(item => item.key)
          .sort()
          .join('|');
        if (seenCombinationKeys.has(combinationKey)) {
          return;
        }

        seenCombinationKeys.add(combinationKey);
        bucket.push(nextCombination);
      });

      combinationsBySum.set(nextSum, bucket);
    }
  });

  return (combinationsBySum.get(targetHp) ?? [])
    .slice(0, MAX_COMBINATION_GROUPS)
    .map(combination => {
      const keys = new Set(combination.map(candidate => candidate.key));
      const hpParts = combination.map(candidate => `${ candidate.hp }HP`);

      return {
        keys,
        moduleCount: combination.length,
        totalHp: targetHp,
        label: hpParts.join(' + ')
      };
    });
}

function moduleStandardId(module: RackedModule): number {
  const standard = module.module.standard;
  if (typeof standard === 'number') {
    return standard;
  }
  return standard?.id ?? 0;
}
