import { RACK_BALANCE_AXES } from './rack-balance-analysis.constants';
import { RackBalanceAnalysisResult } from './rack-balance-analysis.types';
import {
  buildRackBalanceDiffSummary,
  computeRackBalanceDiff,
  RackBalanceAxisDiff,
  resolveTagAxis
} from './rack-balance-analysis.utils';


describe('resolveTagAxis', () => {
  it('maps every configured database tag name to its balance axis', () => {
    for (const axis of RACK_BALANCE_AXES) {
      for (const tagName of axis.dbTagNames) {
        expect(resolveTagAxis(tagName)).withContext(`${ tagName } should resolve to ${ axis.id }`).toBe(axis.id);
      }
    }
  });

  it('falls back to purpose pattern matches', () => {
    expect(resolveTagAxis('dual oscillator')).toBe('voices');
    expect(resolveTagAxis('random modulation')).toBe('modulation');
    expect(resolveTagAxis('clock divider')).toBe('timing');
  });

  it('returns null for blank or unmapped strings', () => {
    expect(resolveTagAxis('')).toBeNull();
    expect(resolveTagAxis('wooden side cheeks')).toBeNull();
  });
});

describe('computeRackBalanceDiff', () => {
  function analysis(shares: Partial<Record<string, number>>): RackBalanceAnalysisResult {
    return {
      axes: RACK_BALANCE_AXES.map(axis => ({
        id: axis.id,
        label: axis.label,
        icon: axis.icon,
        share: shares[axis.id] ?? 0,
        matchedModules: shares[axis.id] ?? 0,
        guidance: axis.guidance.balanced
      })),
      confidence: 1,
      recognizedModuleCount: 5,
      totalModules: 5,
      warningMessage: null,
      summary: '',
      isEmpty: false
    };
  }

  it('computes share and matched module deltas by axis id', () => {
    const diff = computeRackBalanceDiff(
      analysis({voices: 40, modulation: 10}),
      analysis({voices: 25, modulation: 35}),
      'Current',
      'Planned'
    );

    expect(diff.leftLabel).toBe('Current');
    expect(diff.rightLabel).toBe('Planned');
    expect(diff.axes.find(axis => axis.id === 'voices')?.shareDiff).toBe(15);
    expect(diff.axes.find(axis => axis.id === 'voices')?.matchedModulesDiff).toBe(15);
    expect(diff.axes.find(axis => axis.id === 'modulation')?.shareDiff).toBe(-25);
  });

  it('summarizes strongest positive and negative changes', () => {
    const summary = computeRackBalanceDiff(
      analysis({voices: 45, utilities: 20, modulation: 5}),
      analysis({voices: 20, utilities: 12, modulation: 25}),
      'Current',
      'Planned'
    ).summary;

    expect(summary).toBe('Current has more Voices (+25 pts) and Utilities (+8 pts) while Planned has more Modulation (+20 pts).');
  });

  it('summarizes equal profiles neutrally', () => {
    const axes: RackBalanceAxisDiff[] = analysis({voices: 20}).axes.map(axis => ({
      ...axis,
      shareDiff: 0,
      matchedModulesDiff: 0
    }));

    expect(buildRackBalanceDiffSummary(axes, 'A', 'B')).toBe('A and B have the same balance profile.');
  });
});
