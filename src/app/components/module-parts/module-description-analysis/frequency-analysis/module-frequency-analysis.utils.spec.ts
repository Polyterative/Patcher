import { extractFrequencyBands } from './module-frequency-analysis.utils';

describe('extractFrequencyBands', () => {
  it('returns no bands for empty or frequency-free descriptions', () => {
    expect(extractFrequencyBands('')).toEqual([]);
    expect(extractFrequencyBands('A flexible modulation utility with attenuverters.')).toEqual([]);
  });

  it('extracts Hz ranges and converts kHz values', () => {
    expect(extractFrequencyBands('The filter sweeps from 20Hz to 2.5kHz.')).toEqual([
      jasmine.objectContaining({lowHz: 20, highHz: 2500})
    ]);
  });

  it('extracts compact ranges joined with and', () => {
    expect(extractFrequencyBands('High band 5kHz and 20kHz.')).toEqual([
      jasmine.objectContaining({label: 'High', lowHz: 5000, highHz: 20000})
    ]);
  });

  it('extracts frequency ranges written with hertz and kilohertz words', () => {
    expect(extractFrequencyBands('The response spans from 20 hertz to 20 kilohertz.')).toEqual([
      jasmine.objectContaining({lowHz: 20, highHz: 20000})
    ]);
  });

  it('extracts named bands from the sample EQ description', () => {
    const description = 'A 3-band stereo equalizer featuring a frequency range control for the mid band. The high band offers +/-8dB boost or cut between 5kHz and 20kHz. The mid band includes a dedicated frequency control setting the target frequency for +/-5dB adjustment from 500Hz to 2.2kHz, dependent on the knob position.';

    const bands = extractFrequencyBands(description);

    expect(bands).toEqual([
      jasmine.objectContaining({label: 'High', lowHz: 5000, highHz: 20000}),
      jasmine.objectContaining({label: 'Mid', lowHz: 500, highHz: 2200})
    ]);
  });

  it('renders single center frequencies as a one-octave bracket clamped to chart bounds', () => {
    expect(extractFrequencyBands('Cutoff at 1kHz with voltage control.')).toEqual([
      jasmine.objectContaining({label: 'Cutoff', lowHz: 500, highHz: 2000, centerHz: 1000})
    ]);
    expect(extractFrequencyBands('Center frequency at 440Hz.')).toEqual([
      jasmine.objectContaining({label: 'Frequency', lowHz: 220, highHz: 880, centerHz: 440})
    ]);
    expect(extractFrequencyBands('A sub oscillator centered at 30Hz.')).toEqual([
      jasmine.objectContaining({lowHz: 20, highHz: 60, centerHz: 30})
    ]);
  });

  it('labels multiple named ranges from the same sentence by nearest band name', () => {
    const bands = extractFrequencyBands('Low band from 20Hz to 300Hz and high band from 5kHz to 20kHz.');

    expect(bands).toEqual([
      jasmine.objectContaining({label: 'Low', lowHz: 20, highHz: 300}),
      jasmine.objectContaining({label: 'High', lowHz: 5000, highHz: 20000})
    ]);
  });

  it('extracts five-band EQ shorthand with shelf and peak labels', () => {
    const bands = extractFrequencyBands('Bands include HIGH 10 kHz shelf, HI-MID 4 kHz peak, MID 1 kHz peak, LO-MID 400 Hz peak, and LOW 100 Hz shelf.');

    expect(bands).toEqual([
      jasmine.objectContaining({label: 'High shelf', lowHz: 5000, highHz: 20000, centerHz: 10000}),
      jasmine.objectContaining({label: 'Hi-mid peak', lowHz: 2000, highHz: 8000, centerHz: 4000}),
      jasmine.objectContaining({label: 'Mid peak', lowHz: 500, highHz: 2000, centerHz: 1000}),
      jasmine.objectContaining({label: 'Lo-mid peak', lowHz: 200, highHz: 800, centerHz: 400}),
      jasmine.objectContaining({label: 'Low shelf', lowHz: 50, highHz: 200, centerHz: 100})
    ]);
  });

  it('limits noisy output only after eight detected bands', () => {
    const bands = extractFrequencyBands('20Hz. 30Hz. 40Hz. 50Hz. 60Hz. 70Hz. 80Hz. 90Hz. 100Hz.');

    expect(bands.length).toBe(8);
  });
});
