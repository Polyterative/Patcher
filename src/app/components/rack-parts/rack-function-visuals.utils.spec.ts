import { TagType } from 'src/app/models/tag';
import {
  buildFunctionAnalysisCoverageSummary,
  buildFunctionAnalysisLegendItems,
  buildFunctionAnalysisResidualLabel,
  buildRackFunctionVisual,
  buildRowFunctionBreakdowns,
  buildRowFunctionResidualLabel,
  isTrackedFunctionRole
} from './rack-function-visuals.utils';

describe('rackFunctionVisualsUtils', () => {
  function makeRackedModule(
    moduleId: number,
    tags: Array<{name: string; type: TagType | string | number; votes?: number}> = [],
    hp = 8
  ): any {
    return {
      module: {
        id: moduleId,
        hp,
        tags: tags.map((tag, index) => ({
          id: index + 1,
          tag: {
            id: index + 1,
            name: tag.name,
            type: tag.type
          },
          voteCount: Array.from({length: tag.votes ?? 0}, () => ({moduletagid: index + 1}))
        }))
      },
      rackingData: {
        id: moduleId,
        row: 0,
        column: 0
      }
    };
  }

  it('maps direct voice tags to the voices function color', () => {
    const visual = buildRackFunctionVisual(makeRackedModule(101, [
      {name: 'VCO', type: TagType.Purpose}
    ]));

    expect(visual).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--voices',
      roleLabel: 'Voices',
      tagLabel: 'Primary tag: VCO'
    }));
  });

  it('prefers purpose matches over weaker secondary matches when choosing a primary role', () => {
    const visual = buildRackFunctionVisual(makeRackedModule(102, [
      {name: 'Processor', type: TagType.Nature},
      {name: 'Envelope Gen.', type: TagType.Purpose}
    ]));

    expect(visual).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--modulation',
      roleLabel: 'Modulation',
      tagLabel: 'Primary tag: Envelope Gen.'
    }));
  });

  it('uses the highest-voted matching tag even when it is not first in the tag list', () => {
    const visual = buildRackFunctionVisual(makeRackedModule(104, [
      {name: 'Mixer', type: TagType.Purpose, votes: 1},
      {name: 'VCO', type: TagType.Purpose, votes: 6}
    ]));

    expect(visual).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--voices',
      roleLabel: 'Voices',
      tagLabel: 'Primary tag: VCO'
    }));
  });

  it('returns a neutral unclassified visual when no recognized role tags are present', () => {
    const visual = buildRackFunctionVisual(makeRackedModule(103, [
      {name: 'Experimental', type: TagType.Character}
    ]));

    expect(visual).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--unclassified',
      roleLabel: 'Unclassified'
    }));
  });

  it('treats blank modules as spacers in function analysis mode', () => {
    const visual = buildRackFunctionVisual(makeRackedModule(4647, [
      {name: 'VCO', type: TagType.Purpose}
    ]));

    expect(visual).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--blank',
      roleLabel: 'Blank',
      tagLabel: 'Spacer'
    }));
  });

  it('builds function analysis legend totals from module counts and hp', () => {
    const items = buildFunctionAnalysisLegendItems([[
      makeRackedModule(201, [{name: 'VCO', type: TagType.Purpose}], 10),
      makeRackedModule(202, [{name: 'Envelope Gen.', type: TagType.Purpose}], 12),
      makeRackedModule(4647, [], 4)
    ]]);

    expect(items.find(item => item.label === 'Voices')).toEqual(jasmine.objectContaining({
      count: 1,
      hp: 10
    }));
    expect(items.find(item => item.label === 'Modulation')).toEqual(jasmine.objectContaining({
      count: 1,
      hp: 12
    }));
    expect(items.find(item => item.label === 'Utilities')).toEqual(jasmine.objectContaining({
      count: 0,
      hp: 0
    }));
  });

  it('reports residual function analysis modules and tracked coverage', () => {
    const rowedRackedModules = [[
      makeRackedModule(301, [{name: 'VCO', type: TagType.Purpose}], 10),
      makeRackedModule(4647, [], 4),
      makeRackedModule(302, [{name: 'Experimental', type: TagType.Character}], 8)
    ]];

    expect(buildFunctionAnalysisResidualLabel(rowedRackedModules)).toBe('2 blank or unclassified (12HP)');
    expect(buildFunctionAnalysisCoverageSummary(rowedRackedModules)).toBe('Tracked 1/3 modules · 10/22HP');
  });

  it('omits the residual label when every module maps to a tracked function role', () => {
    const rowedRackedModules = [[
      makeRackedModule(311, [{name: 'VCO', type: TagType.Purpose}], 10),
      makeRackedModule(312, [{name: 'Envelope Gen.', type: TagType.Purpose}], 12)
    ]];

    expect(buildFunctionAnalysisResidualLabel(rowedRackedModules)).toBeNull();
  });

  it('builds per-row function breakdowns and residual labels', () => {
    const breakdowns = buildRowFunctionBreakdowns([
      [
        makeRackedModule(401, [{name: 'VCO', type: TagType.Purpose}], 10),
        makeRackedModule(402, [{name: 'Envelope Gen.', type: TagType.Purpose}], 12),
        makeRackedModule(4647, [], 4)
      ],
      [
        makeRackedModule(403, [{name: 'Experimental', type: TagType.Character}], 6)
      ]
    ]);

    expect(breakdowns.get(0)).toEqual(jasmine.objectContaining({
      moduleCount: 3,
      residualCount: 1,
      residualHp: 4
    }));
    expect(breakdowns.get(0)?.roles.map(role => role.label)).toEqual(['Modulation', 'Voices']);
    expect(buildRowFunctionResidualLabel(breakdowns.get(0) ?? null)).toBe('1 module blank or unclassified (4HP)');
    expect(buildRowFunctionResidualLabel(breakdowns.get(1) ?? null)).toBe('1 module blank or unclassified in this row');
  });

  it('reports when an entire row maps cleanly to tracked function roles', () => {
    const breakdowns = buildRowFunctionBreakdowns([[
      makeRackedModule(411, [{name: 'VCO', type: TagType.Purpose}], 10),
      makeRackedModule(412, [{name: 'Envelope Gen.', type: TagType.Purpose}], 12)
    ]]);

    expect(buildRowFunctionResidualLabel(breakdowns.get(0) ?? null)).toBe('All modules in this row map to tracked function roles.');
  });

  it('detects tracked function role class names', () => {
    expect(isTrackedFunctionRole('functionAnalysisModule--voices')).toBeTrue();
    expect(isTrackedFunctionRole('functionAnalysisModule--blank')).toBeFalse();
  });
});
