import {
  buildRackLayoutHoverCandidates,
  buildRackLayoutHoverVisuals,
  rackLayoutHoverPhaseCount
} from './rack-layout-hover-highlight.utils';
import { RackedModule } from 'src/app/models/module';


describe('rackLayoutHoverHighlightUtils', () => {
  function makeRackedModule(
    moduleId: number,
    hp: number,
    row: number,
    column: number,
    standardId = 0
  ): RackedModule {
    return {
      module: {
        id: moduleId,
        hp,
        standard: {id: standardId}
      },
      rackingData: {
        id: moduleId,
        row,
        column
      }
    } as unknown as RackedModule;
  }

  function keyForModule(module: RackedModule): string {
    return `${ module.rackingData.id }|${ module.module.id }|${ module.rackingData.row }|${ module.rackingData.column }`;
  }

  it('collects exact HP matches before smaller-module combinations', () => {
    const hovered = makeRackedModule(10, 14, 0, 0);
    const exact = makeRackedModule(11, 14, 0, 1);
    const comboA = makeRackedModule(12, 8, 0, 2);
    const comboB = makeRackedModule(13, 6, 0, 3);
    const unrelated = makeRackedModule(14, 5, 0, 4);

    const candidates = buildRackLayoutHoverCandidates(
      [[hovered, exact, comboA, comboB, unrelated]],
      hovered,
      keyForModule
    );

    expect(candidates.exactMatchKeys).toEqual(new Set([keyForModule(exact)]));
    expect(candidates.combinationGroups.length).toBe(1);
    expect(candidates.combinationGroups[0].keys).toEqual(new Set([keyForModule(comboA), keyForModule(comboB)]));
    expect(candidates.combinationGroups[0].label).toBe('8HP + 6HP');
  });

  it('cycles visual phases from exact matches to each fitting combination', () => {
    const hovered = makeRackedModule(10, 14, 0, 0);
    const exact = makeRackedModule(11, 14, 0, 1);
    const comboA = makeRackedModule(12, 8, 0, 2);
    const comboB = makeRackedModule(13, 6, 0, 3);
    const rows = [[hovered, exact, comboA, comboB]];
    const candidates = buildRackLayoutHoverCandidates(rows, hovered, keyForModule);

    const exactVisuals = buildRackLayoutHoverVisuals(rows, candidates, 0, keyForModule);
    const comboVisuals = buildRackLayoutHoverVisuals(rows, candidates, 1, keyForModule);

    expect(rackLayoutHoverPhaseCount(candidates)).toBe(2);
    expect(exactVisuals.get(keyForModule(hovered))?.className).toBe('layoutAnalysisModule--anchor');
    expect(exactVisuals.get(keyForModule(exact))?.className).toBe('layoutAnalysisModule--exact');
    expect(exactVisuals.get(keyForModule(comboA))?.className).toBe('layoutAnalysisModule--inactive');
    expect(comboVisuals.get(keyForModule(exact))?.className).toBe('layoutAnalysisModule--inactive');
    expect(comboVisuals.get(keyForModule(comboA))?.className).toBe('layoutAnalysisModule--combo');
    expect(comboVisuals.get(keyForModule(comboB))?.className).toBe('layoutAnalysisModule--combo');
  });

  it('ignores blanks and modules from incompatible standards', () => {
    const hovered = makeRackedModule(10, 14, 0, 0);
    const blank = makeRackedModule(4647, 14, 0, 1);
    const oneUExact = makeRackedModule(11, 14, 1, 0, 1);
    const oneUComboA = makeRackedModule(12, 8, 1, 1, 1);
    const oneUComboB = makeRackedModule(13, 6, 1, 2, 1);

    const candidates = buildRackLayoutHoverCandidates(
      [[hovered, blank], [oneUExact, oneUComboA, oneUComboB]],
      hovered,
      keyForModule
    );

    expect(candidates.exactMatchKeys.size).toBe(0);
    expect(candidates.combinationGroups.length).toBe(0);
  });
});
