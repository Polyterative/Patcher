import { parseColor, interpolateColor } from './graph.utils';

describe('graph.utils', () => {
  describe('parseColor', () => {
    it('parses 6-char hex', () => {
      expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses 3-char shorthand hex', () => {
      expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses rgb() string', () => {
      expect(parseColor('rgb(100, 150, 200)')).toEqual({ r: 100, g: 150, b: 200 });
    });

    it('returns grey fallback for unrecognised format', () => {
      expect(parseColor('transparent')).toEqual({ r: 128, g: 128, b: 128 });
    });

    it('parses black', () => {
      expect(parseColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('parses white', () => {
      expect(parseColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('interpolateColor', () => {
    it('returns from-color at weight 0', () => {
      expect(interpolateColor('#ff0000', '#0000ff', 0)).toBe('rgb(255, 0, 0)');
    });

    it('returns to-color at weight 1', () => {
      expect(interpolateColor('#ff0000', '#0000ff', 1)).toBe('rgb(0, 0, 255)');
    });

    it('clamps weight below 0', () => {
      expect(interpolateColor('#ff0000', '#0000ff', -5)).toBe('rgb(255, 0, 0)');
    });

    it('clamps weight above 1', () => {
      expect(interpolateColor('#ff0000', '#0000ff', 5)).toBe('rgb(0, 0, 255)');
    });

    it('interpolates midpoint', () => {
      expect(interpolateColor('#000000', '#ffffff', 0.5)).toBe('rgb(128, 128, 128)');
    });
  });
});
