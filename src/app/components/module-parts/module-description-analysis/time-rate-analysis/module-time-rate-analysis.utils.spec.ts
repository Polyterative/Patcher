import { extractTimeRateFeatures } from './module-time-rate-analysis.utils';

describe('extractTimeRateFeatures', () => {
  it('returns no features for empty or low-confidence text', () => {
    expect(extractTimeRateFeatures('')).toEqual([]);
    expect(extractTimeRateFeatures('A compact stereo utility.')).toEqual([]);
  });

  it('extracts envelope times and tempo values', () => {
    const features = extractTimeRateFeatures('Attack time 5ms, release 2 seconds, tempo 120 BPM.');

    expect(features).toEqual([
      jasmine.objectContaining({label: 'Attack', value: '5 ms'}),
      jasmine.objectContaining({label: 'Release', value: '2 s'}),
      jasmine.objectContaining({label: 'Tempo', value: '120 BPM'})
    ]);
  });

  it('extracts contextual Hz rates without treating plain audio band frequencies as rates', () => {
    expect(extractTimeRateFeatures('The LFO rate reaches 20Hz.')).toEqual([
      jasmine.objectContaining({label: 'LFO', value: '20 Hz'})
    ]);
    expect(extractTimeRateFeatures('High band reaches 20kHz.')).toEqual([]);
  });

  it('extracts rate cues', () => {
    const features = extractTimeRateFeatures('Audio-rate modulation with tempo sync and clock-rate triggers.');

    expect(features).toEqual([
      jasmine.objectContaining({value: 'Audio-rate'}),
      jasmine.objectContaining({value: 'Clock-rate'}),
      jasmine.objectContaining({value: 'Tempo sync'})
    ]);
  });
});
