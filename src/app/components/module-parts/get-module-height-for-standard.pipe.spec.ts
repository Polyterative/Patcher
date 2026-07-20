import { Standard } from '../../models/standard';
import {
  getModulePanelAspectRatio,
  GetModuleHeightForStandardPipe
} from './get-module-height-for-standard.pipe';
import { MODULE_FORMAT_GEOMETRY } from './module-format-geometry.constants';


type ModuleAspectRatioFixture = Parameters<typeof getModulePanelAspectRatio>[0];

function standardFixture(id: number, name = `standard-${ id }`): Standard {
  return {id, name};
}

function moduleAspectRatioFixture(hp: number, standard: Standard): ModuleAspectRatioFixture {
  return {hp, standard};
}

describe('GetModuleHeightForStandardPipe', () => {
  let pipe: GetModuleHeightForStandardPipe;
  
  beforeEach(() => {
    pipe = new GetModuleHeightForStandardPipe();
  });
  
  it('returns 25.4 rem for standard id 0 (default 3U)', () => {
    expect(pipe.transform(standardFixture(0, '3U'))).toBe(25.4);
  });
  
  it('returns 25.4 rem for standard id 1000', () => {
    expect(pipe.transform(standardFixture(1000, '3U alt'))).toBe(25.4);
  });
  
  it('returns the canonical Intellijel 1U height for standard id 1', () => {
    expect(MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightMm).toBe(39.65);
    expect(MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightRem).toBe(7.8374);
    expect(pipe.transform(standardFixture(1, 'Intellijel 1U')))
      .toBe(7.8374);
  });
  
  it('returns the canonical Pulp Logic 1U height for standard id 2', () => {
    expect(MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U.heightMm).toBe(43.18);
    expect(MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U.heightRem).toBe(8.5352);
    expect(pipe.transform(standardFixture(2, 'Pulp Logic 1U')))
      .toBe(8.5352);
  });
  
  it('falls back to the generic 1U geometry for unknown non-3U standard ids', () => {
    expect(pipe.transform(standardFixture(99, 'Other')))
      .toBe(MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightRem);
  });

  it('derives the same aspect ratio used by realistic module rendering for 3U modules', () => {
    expect(getModulePanelAspectRatio(moduleAspectRatioFixture(10, standardFixture(0, '3U'))))
      .toBeCloseTo(10 / MODULE_FORMAT_GEOMETRY.EURORACK_3U.heightRem, 6);
  });

  it('derives the same aspect ratio used by realistic module rendering for Intellijel 1U modules', () => {
    expect(getModulePanelAspectRatio(moduleAspectRatioFixture(12, standardFixture(1, 'Intellijel 1U'))))
      .toBeCloseTo(12 / MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightRem, 6);
  });

  it('derives the same aspect ratio used by realistic module rendering for Pulp Logic 1U modules', () => {
    expect(getModulePanelAspectRatio(moduleAspectRatioFixture(12, standardFixture(2, 'Pulp Logic 1U'))))
      .toBeCloseTo(12 / MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U.heightRem, 6);
  });

  it('keeps render height and crop ratio aligned for every supported format', () => {
    const standardIds = [0, 1, 2, 1000];

    standardIds.forEach(id => {
      const standard = standardFixture(id);
      const height = pipe.transform(standard);
      const ratio = getModulePanelAspectRatio(moduleAspectRatioFixture(10, standard));

      expect(ratio).toBeCloseTo(10 / height, 6);
    });
  });
});
