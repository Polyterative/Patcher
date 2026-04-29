import { TestBed } from '@angular/core/testing';
import { RackedModule } from 'src/app/models/module';
import { TagType } from 'src/app/models/tag';
import { RackBalanceAnalysisService } from './rack-balance-analysis.service';

function makeRackedModule(id: number, tagData: Array<{name: string; type: TagType}> = []): RackedModule {
  return {
    rackingData: {
      id,
      row: 0,
      column: id - 1,
      moduleid: id,
      rackid: 1
    },
    module: {
      id,
      name: `Module ${ id }`,
      hp: 8,
      description: '',
      public: true,
      manufacturer: {id: 1, name: 'Maker'},
      manufacturerId: 1,
      standard: {id: 0, name: '3U Eurorack'},
      tags: tagData.map((tag, index) => ({
        id: id * 100 + index,
        tag: {
          id: id * 100 + index,
          name: tag.name,
          type: tag.type
        },
        voteCount: [{moduletagid: id * 100 + index}]
      })),
      panels: [],
      ins: [],
      outs: [],
      switches: [],
      manualURL: '',
      store_url: null,
      additional: null,
      isComplete: true,
      isApproved: true,
      isDIY: false,
      powerPos12: 0,
      powerNeg12: 0,
      powerPos5: 0,
      depth: 0,
      weight: 0,
      created: '',
      updated: ''
    }
  } as RackedModule;
}

describe('RackBalanceAnalysisService', () => {
  let service: RackBalanceAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RackBalanceAnalysisService]
    });
    service = TestBed.inject(RackBalanceAnalysisService);
  });

  it('returns an empty advisory state when the rack has no modules', () => {
    const result = service.analyze([]);

    expect(result.isEmpty).toBeTrue();
    expect(result.totalModules).toBe(0);
    expect(result.summary).toContain('Balance analysis appears once');
    expect(result.axes.every(axis => axis.share === 0)).toBeTrue();
  });

  it('scores recognized axes from purpose and nature tags', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'VCO', type: TagType.Purpose}]),
      makeRackedModule(2, [{name: 'Utility', type: TagType.Nature}]),
      makeRackedModule(3, [{name: 'Envelope', type: TagType.Purpose}]),
    ]];

    const result = service.analyze(rack);
    const voices = result.axes.find(axis => axis.id === 'voices');
    const utilities = result.axes.find(axis => axis.id === 'utilities');
    const modulation = result.axes.find(axis => axis.id === 'modulation');

    expect(result.isEmpty).toBeFalse();
    expect(result.recognizedModuleCount).toBe(3);
    expect(voices?.matchedModules).toBe(1);
    expect(utilities?.matchedModules).toBe(1);
    expect(modulation?.matchedModules).toBe(1);
  });

  it('reports partial confidence when many modules have no recognized tags', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'VCO', type: TagType.Purpose}]),
      makeRackedModule(2),
      makeRackedModule(3),
      makeRackedModule(4)
    ]];

    const result = service.analyze(rack);

    expect(result.confidence).toBe(0.25);
    expect(result.warningMessage).toContain('Guidance is partial');
    expect(result.summary).toContain('Early signal only');
  });

  it('surfaces balanced guidance when coverage is broad across axes', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'VCO', type: TagType.Purpose}]),
      makeRackedModule(2, [{name: 'Envelope', type: TagType.Purpose}]),
      makeRackedModule(3, [{name: 'Utility', type: TagType.Nature}]),
      makeRackedModule(4, [{name: 'Clock', type: TagType.Purpose}]),
      makeRackedModule(5, [{name: 'Filter', type: TagType.Purpose}])
    ]];

    const result = service.analyze(rack);

    expect(result.warningMessage).toBeNull();
    expect(result.summary).toContain('fairly evenly spread');
    expect(result.axes.every(axis => axis.share >= 20)).toBeTrue();
  });

  it('keeps guidance neutral when tags are present but do not match tracked axes', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'Experimental', type: TagType.Character}]),
      makeRackedModule(2, [{name: 'Chaotic', type: TagType.Character}])
    ]];

    const result = service.analyze(rack);

    expect(result.recognizedModuleCount).toBe(0);
    expect(result.warningMessage).toContain('0 of 2 modules');
    expect(result.summary).toContain('No recognized balance tags');
  });
});
