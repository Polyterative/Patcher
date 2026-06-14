import { RACK_BALANCE_AXES } from './rack-balance-analysis.constants';
import { resolveTagAxis } from './rack-balance-analysis.utils';


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
