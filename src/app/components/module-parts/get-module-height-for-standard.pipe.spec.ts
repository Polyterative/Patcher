import { Standard } from '../../models/standard';
import {
  getModulePanelAspectRatio,
  GetModuleHeightForStandardPipe
} from './get-module-height-for-standard.pipe';


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
  
  it('returns 7.6 rem for standard id 1 (Intellijel 1U)', () => {
    expect(pipe.transform({id: 1, name: 'Intellijel 1U'} as Standard)).toBe(7.6);
  });
  
  it('returns 7.6 rem for standard id 2 (Pulp Logic 1U)', () => {
    expect(pipe.transform({id: 2, name: 'Pulp Logic 1U'} as Standard)).toBe(7.6);
  });
  
  it('returns 7.6 rem for any standard id other than 0 or 1000', () => {
    expect(pipe.transform({id: 99, name: 'Other'} as Standard)).toBe(7.6);
  });

  it('derives the same aspect ratio used by realistic module rendering for 3U modules', () => {
    expect(getModulePanelAspectRatio({
      hp: 10,
      standard: {id: 0, name: '3U'}
    } as any)).toBeCloseTo(10 / 25.4, 6);
  });

  it('derives the same aspect ratio used by realistic module rendering for 1U modules', () => {
    expect(getModulePanelAspectRatio({
      hp: 20,
      standard: {id: 2, name: 'Pulp Logic 1U'}
    } as any)).toBeCloseTo(20 / 7.6, 6);
  });
});
