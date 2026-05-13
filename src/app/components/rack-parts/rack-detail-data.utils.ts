import { RackedModule } from '../../models/module';
import { RackMinimal } from '../../models/rack';

const BLANK_IDS_STANDARD_0: Record<number, number> = {
  1: 4666, 2: 4647, 3: 4665, 4: 4648, 5: 4664,
  6: 4649, 7: 4650, 8: 4651, 9: 4652, 10: 4653,
  11: 4654, 12: 4655, 13: 4656, 14: 4657, 15: 4658,
  16: 4659, 17: 4660, 18: 4661, 19: 4662, 20: 4663
};

const BLANK_IDS_STANDARD_1: Record<number, number> = {
  1: 4711, 2: 4712, 3: 4713, 4: 4714, 5: 4715,
  6: 4716, 7: 4717, 8: 4718, 9: 4719, 10: 4720,
  11: 4721, 12: 4722, 13: 4723, 14: 4724, 15: 4725,
  16: 4726, 17: 4727, 18: 4728, 19: 4729, 20: 4730,
  21: 4731, 22: 4732, 23: 4733, 24: 4734, 25: 4735
};

export function buildRackStatistics(rows: RackedModule[][]): {name: string; value: string}[] {
  const byHP = rows.flatMap(row => row)
    .filter(m => m.module.standard.id === 0)
    .reduce((map, m) => {
      const hp = m.module.hp;
      return map.set(hp, (map.get(hp) ?? 0) + 1);
    }, new Map<number, number>());

  return Array.from(byHP.entries())
    .sort(([a], [b]) => a - b)
    .map(([hp, count]) => ({name: `${ hp }HP count`, value: String(count)}));
}

export function extractCreatedPatchId(
  response: {id?: number; data?: Array<{id?: number}>} | undefined
): number {
  const createdPatchId = response?.data?.[0]?.id ?? response?.id;

  if (!createdPatchId) {
    throw new Error('Patch creation did not return a patch id.');
  }

  return createdPatchId;
}

export function isAnyModuleWithoutRackingId(rackModules: RackedModule[][]): boolean {
  return rackModules.flatMap(row => row)
    .some(module => module.rackingData.id === undefined);
}

export function buildRowedModulesArray(rackedModules: RackedModule[], rackData: RackMinimal): RackedModule[][] {
  const rowedRackedModules: RackedModule[][] = Array.from(
    {length: rackData.rows},
    (_, i) => rackedModules.filter(module => module.rackingData.row === i)
  );

  const modulesWithoutRowAndColumn = rackedModules.filter(
    module => module.rackingData.row === null && module.rackingData.column === null
  );

  if (modulesWithoutRowAndColumn.length > 0) {
    rowedRackedModules.push(modulesWithoutRowAndColumn);
  }

  return rowedRackedModules;
}

export function calculateBlankIdForSizeAndStandard(hp: number, standard: number = 0): number {
  const map = standard === 0 ? BLANK_IDS_STANDARD_0
    : standard === 1 ? BLANK_IDS_STANDARD_1
      : null;
  return map?.[hp] ?? -1;
}
