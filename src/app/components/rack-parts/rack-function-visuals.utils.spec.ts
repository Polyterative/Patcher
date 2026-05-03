import { TagType } from 'src/app/models/tag';
import { buildRackFunctionVisual } from './rack-function-visuals.utils';

describe('rackFunctionVisualsUtils', () => {
  function makeRackedModule(
    moduleId: number,
    tags: Array<{name: string; type: TagType | string | number; votes?: number}> = []
  ): any {
    return {
      module: {
        id: moduleId,
        hp: 8,
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
});
