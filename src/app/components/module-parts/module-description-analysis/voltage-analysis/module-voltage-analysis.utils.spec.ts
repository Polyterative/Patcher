import { extractVoltageFeatures } from './module-voltage-analysis.utils';

describe('extractVoltageFeatures', () => {
  it('returns no features for empty or low-confidence text', () => {
    expect(extractVoltageFeatures('')).toEqual([]);
    expect(extractVoltageFeatures('A musical controller with five channels.')).toEqual([]);
  });

  it('extracts bipolar voltage shorthand', () => {
    expect(extractVoltageFeatures('CV input accepts ±5V modulation.')).toEqual([
      jasmine.objectContaining({label: '±5V', lowV: -5, highV: 5, kind: 'range'})
    ]);
  });

  it('does not duplicate plus/minus shorthand as a contextual gate marker', () => {
    const features = extractVoltageFeatures('The gate output is plus/minus 5V.');

    expect(features).toEqual([
      jasmine.objectContaining({label: '±5V', lowV: -5, highV: 5, kind: 'range'})
    ]);
  });

  it('extracts unipolar and bipolar voltage ranges', () => {
    const features = extractVoltageFeatures('Range switches between -10 to +10V and 0-5 volts.');

    expect(features).toEqual([
      jasmine.objectContaining({lowV: -10, highV: 10}),
      jasmine.objectContaining({lowV: 0, highV: 5})
    ]);
  });

  it('extracts tracking and gate or trigger level markers', () => {
    const features = extractVoltageFeatures('Pitch tracks 1V/oct with 5V gate and 2.5V trigger levels.');

    expect(features).toEqual([
      jasmine.objectContaining({label: '1V/oct', kind: 'tracking'}),
      jasmine.objectContaining({label: 'Gate +5V', kind: 'marker'}),
      jasmine.objectContaining({label: 'Trig +2.5V', kind: 'marker'})
    ]);
  });
});
