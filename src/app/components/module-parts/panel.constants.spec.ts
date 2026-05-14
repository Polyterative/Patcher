import { derivePanelLabel, PANEL_COLORS } from './panel.constants';

describe('panel.constants', () => {
  describe('PANEL_COLORS', () => {
    it('maps 1 to Light', () => {
      expect(PANEL_COLORS[1]).toBe('Light');
    });

    it('maps 2 to Dark', () => {
      expect(PANEL_COLORS[2]).toBe('Dark');
    });

    it('maps 3 to Special edition', () => {
      expect(PANEL_COLORS[3]).toBe('Special edition');
    });
  });

  describe('derivePanelLabel', () => {
    it('returns trimmed description when present', () => {
      expect(derivePanelLabel('file.png', '  Silver  ', 0)).toBe('Silver');
    });

    it('extracts keyword from filename segments', () => {
      expect(derivePanelLabel('vco-dark.png', null, 0)).toBe('Dark');
    });

    it('extracts v2 keyword', () => {
      expect(derivePanelLabel('module-v2.png', null, 0)).toBe('V2');
    });

    it('falls back to Panel N+1 when no keyword matches', () => {
      expect(derivePanelLabel('weird_name.png', null, 2)).toBe('Panel 3');
    });

    it('handles empty filename gracefully', () => {
      expect(derivePanelLabel('', null, 0)).toBe('Panel 1');
    });

    it('prefers description over filename', () => {
      expect(derivePanelLabel('dark-panel.png', 'Custom Label', 0)).toBe('Custom Label');
    });
  });
});
