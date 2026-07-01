import { extractClockDivisionFeatures } from './module-clock-division-analysis.utils';

describe('extractClockDivisionFeatures', () => {
  it('returns no features for empty or irrelevant text', () => {
    expect(extractClockDivisionFeatures('')).toEqual([]);
    expect(extractClockDivisionFeatures('A simple stereo attenuator.')).toEqual([]);
  });

  it('extracts slash divisions, written divisions, and multipliers', () => {
    const features = extractClockDivisionFeatures('Clock outputs /2, /4, divide by 8 and x2 multipliers.');

    expect(features).toEqual([
      jasmine.objectContaining({label: '/2', kind: 'division'}),
      jasmine.objectContaining({label: '/4', kind: 'division'}),
      jasmine.objectContaining({label: '÷8', kind: 'division'}),
      jasmine.objectContaining({label: 'x2', kind: 'multiplication'})
    ]);
  });

  it('extracts clock behaviors', () => {
    const features = extractClockDivisionFeatures('Includes clock divisions, ratcheting, swing and shuffle.');

    expect(features).toEqual([
      jasmine.objectContaining({label: 'Ratchet'}),
      jasmine.objectContaining({label: 'Swing'}),
      jasmine.objectContaining({label: 'Shuffle'}),
      jasmine.objectContaining({label: 'Clock division'})
    ]);
  });
});
