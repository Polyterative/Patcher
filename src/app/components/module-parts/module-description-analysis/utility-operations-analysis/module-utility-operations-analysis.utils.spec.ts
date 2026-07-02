import { extractUtilityOperationFeatures } from './module-utility-operations-analysis.utils';

describe('extractUtilityOperationFeatures', () => {
  it('returns no features for empty or irrelevant text', () => {
    expect(extractUtilityOperationFeatures('')).toEqual([]);
    expect(extractUtilityOperationFeatures('A warm oscillator voice.')).toEqual([]);
  });

  it('extracts logic and utility operations', () => {
    const features = extractUtilityOperationFeatures('Logic AND, OR, XOR, NOT plus slew, sample and hold, rectify, min/max, attenuate, offset and invert.');

    expect(features).toEqual([
      jasmine.objectContaining({label: 'AND', group: 'logic'}),
      jasmine.objectContaining({label: 'OR', group: 'logic'}),
      jasmine.objectContaining({label: 'XOR', group: 'logic'}),
      jasmine.objectContaining({label: 'NOT', group: 'logic'}),
      jasmine.objectContaining({label: 'Min', group: 'math'}),
      jasmine.objectContaining({label: 'Max', group: 'math'}),
      jasmine.objectContaining({label: 'Slew', group: 'shape'}),
      jasmine.objectContaining({label: 'S&H', group: 'shape'}),
      jasmine.objectContaining({label: 'Rectify', group: 'shape'}),
      jasmine.objectContaining({label: 'Attenuate', group: 'level'}),
      jasmine.objectContaining({label: 'Offset', group: 'level'}),
      jasmine.objectContaining({label: 'Invert', group: 'level'})
    ]);
  });

  it('does not treat ordinary lowercase conjunctions as logic operations', () => {
    expect(extractUtilityOperationFeatures('Works for audio or cv and includes a mixer utility.')).toEqual([
      jasmine.objectContaining({label: 'Sum', group: 'math'})
    ]);
  });

  it('ignores generic compressor and mix prose without explicit utility context', () => {
    const description = `Messor is a stereo compressor with lots of tricks up its sleeves.
      From gluing a mix together to squashing drums, sidechaining kicks and sculpting transients.
      It's a VCA based feed-forward compressor with a high quality low noise signal path.`;

    expect(extractUtilityOperationFeatures(description)).toEqual([]);
  });

  it('does not infer summing from a bare mixer mention', () => {
    expect(extractUtilityOperationFeatures('A utility mixer with two inputs.')).toEqual([]);
  });
});
