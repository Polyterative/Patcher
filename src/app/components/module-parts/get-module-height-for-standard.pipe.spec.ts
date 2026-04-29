import { Standard } from '../../models/standard';
import {
  getModulePanelAspectRatio,
  GetModuleHeightForStandardPipe
} from './get-module-height-for-standard.pipe';
import { MODULE_FORMAT_GEOMETRY } from './module-format-geometry.constants';


describe('GetModuleHeightForStandardPipe', () => {
  let pipe: GetModuleHeightForStandardPipe;
  
  beforeEach(() => {
    pipe = new GetModuleHeightForStandardPipe();
  });
  
  it('returns 25.4 rem for standard id 0 (default 3U)', () => {
    expect(pipe.transform({id: 0, name: '3U'} as Standard)).toBe(25.4);
  });
  
  it('returns 25.4 rem for standard id 1000', () => {
    expect(pipe.transform({id: 1000, name: '3U alt'} as Standard)).toBe(25.4);
  });
  
  it('returns the canonical Intellijel 1U height for standard id 1', () => {
    expect(pipe.transform({id: 1, name: 'Intellijel 1U'} as Standard))
      .toBe(MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightRem);
  });
  
  it('returns the canonical Pulp Logic 1U height for standard id 2', () => {
    expect(pipe.transform({id: 2, name: 'Pulp Logic 1U'} as Standard))
      .toBe(MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U.heightRem);
  });
  
  it('falls back to the generic 1U geometry for unknown non-3U standard ids', () => {
    expect(pipe.transform({id: 99, name: 'Other'} as Standard))
      .toBe(MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightRem);
  });

  it('derives the same aspect ratio used by realistic module rendering for 3U modules', () => {
    expect(getModulePanelAspectRatio({
      hp: 10,
      standard: {id: 0, name: '3U'}
    } as any)).toBeCloseTo(10 / MODULE_FORMAT_GEOMETRY.EURORACK_3U.heightRem, 6);
  });

  it('derives the same aspect ratio used by realistic module rendering for Intellijel 1U modules', () => {
    expect(getModulePanelAspectRatio({
      hp: 12,
      standard: {id: 1, name: 'Intellijel 1U'}
    } as any)).toBeCloseTo(12 / MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightRem, 6);
  });

  it('derives the same aspect ratio used by realistic module rendering for Pulp Logic 1U modules', () => {
    expect(getModulePanelAspectRatio({
      hp: 12,
      standard: {id: 2, name: 'Pulp Logic 1U'}
    } as any)).toBeCloseTo(12 / MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U.heightRem, 6);
  });

  it('keeps render height and crop ratio aligned for every supported format', () => {
    const standardIds = [0, 1, 2, 1000];

    standardIds.forEach(id => {
      const height = pipe.transform({id, name: `standard-${ id }`} as Standard);
      const ratio = getModulePanelAspectRatio({
        hp: 10,
        standard: {id, name: `standard-${ id }`}
      } as any);

      expect(ratio).toBeCloseTo(10 / height, 6);
    });
  });
});
