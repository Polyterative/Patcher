import { extractWaveformFeatures } from './module-waveform-palette-analysis.utils';

describe('extractWaveformFeatures', () => {
  it('returns no features for empty or irrelevant text', () => {
    expect(extractWaveformFeatures('')).toEqual([]);
    expect(extractWaveformFeatures('A utility mixer with two inputs.')).toEqual([]);
  });

  it('extracts waveform names once', () => {
    const features = extractWaveformFeatures('Sine, triangle, saw, ramp, square, pulse, noise output, random voltage and chaos outputs.');

    expect(features).toEqual([
      jasmine.objectContaining({kind: 'sine'}),
      jasmine.objectContaining({kind: 'triangle'}),
      jasmine.objectContaining({kind: 'saw'}),
      jasmine.objectContaining({kind: 'ramp'}),
      jasmine.objectContaining({kind: 'square'}),
      jasmine.objectContaining({kind: 'pulse'}),
      jasmine.objectContaining({kind: 'noise'}),
      jasmine.objectContaining({kind: 'random'}),
      jasmine.objectContaining({kind: 'chaos'})
    ]);
  });

  it('does not treat low-noise compressor prose as a noise waveform', () => {
    expect(extractWaveformFeatures('A VCA compressor with a high quality low noise signal path.')).toEqual([]);
  });

  it('does not duplicate sample and hold as a random waveform', () => {
    expect(extractWaveformFeatures('VCO / Comparator / Sample & Hold // downsampler & lo-fi')).toEqual([]);
  });
});
