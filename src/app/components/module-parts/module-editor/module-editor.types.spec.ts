import {
  buildFittedPanelCropPosition,
  scalePanelCropPosition,
  PANEL_TYPE_OPTIONS,
  PANEL_CROP_FILL_SCALE
} from './module-editor.types';

const makeImagePosition = (x1 = 0, y1 = 0, x2 = 400, y2 = 300) => ({ x1, y1, x2, y2 });

describe('module-editor.types', () => {
  describe('PANEL_TYPE_OPTIONS', () => {
    it('has 4 panel types', () => {
      expect(PANEL_TYPE_OPTIONS.length).toBe(4);
    });

    it('first option is Light with value 1', () => {
      expect(PANEL_TYPE_OPTIONS[0].name).toBe('Light');
      expect(PANEL_TYPE_OPTIONS[0].value).toBe(1);
    });
  });

  describe('PANEL_CROP_FILL_SCALE', () => {
    it('is 0.82', () => {
      expect(PANEL_CROP_FILL_SCALE).toBe(0.82);
    });
  });

  describe('buildFittedPanelCropPosition', () => {
    it('returns a cropped position with correct structure', () => {
      const imagePosition = makeImagePosition();
      const result = buildFittedPanelCropPosition(imagePosition, 1.0);
      expect(result).toEqual(jasmine.objectContaining({ x1: jasmine.any(Number), y1: jasmine.any(Number), x2: jasmine.any(Number), y2: jasmine.any(Number) }));
    });

    it('crops width when image is wider than target ratio', () => {
      const imagePosition = makeImagePosition(0, 0, 400, 200); // wide
      const result = buildFittedPanelCropPosition(imagePosition, 1.0); // square target
      const width = result.x2 - result.x1;
      const height = result.y2 - result.y1;
      expect(Math.abs(width - height)).toBeLessThan(1);
    });

    it('crops height when image is taller than target ratio', () => {
      const imagePosition = makeImagePosition(0, 0, 200, 400); // tall
      const result = buildFittedPanelCropPosition(imagePosition, 2.0); // wide target
      const width = result.x2 - result.x1;
      const height = result.y2 - result.y1;
      expect(Math.abs(width / height - 2.0)).toBeLessThan(0.01);
    });

    it('centers the crop position', () => {
      const imagePosition = makeImagePosition(0, 0, 400, 200);
      const result = buildFittedPanelCropPosition(imagePosition, 1.0);
      const centerX = (result.x1 + result.x2) / 2;
      expect(Math.abs(centerX - 200)).toBeLessThan(1);
    });
  });

  describe('scalePanelCropPosition', () => {
    it('returns a crop position with expected fields', () => {
      const pos = makeImagePosition(50, 50, 200, 200);
      const imgPos = makeImagePosition(0, 0, 400, 400);
      const result = scalePanelCropPosition(pos, 1.5, imgPos, 1.0);
      expect(result).toEqual(jasmine.objectContaining({ x1: jasmine.any(Number), y1: jasmine.any(Number), x2: jasmine.any(Number), y2: jasmine.any(Number) }));
    });

    it('stays within image bounds', () => {
      const pos = makeImagePosition(0, 0, 400, 400);
      const imgPos = makeImagePosition(0, 0, 400, 400);
      const result = scalePanelCropPosition(pos, 2.0, imgPos, 1.0);
      expect(result.x1).toBeGreaterThanOrEqual(imgPos.x1);
      expect(result.y1).toBeGreaterThanOrEqual(imgPos.y1);
      expect(result.x2).toBeLessThanOrEqual(imgPos.x2);
      expect(result.y2).toBeLessThanOrEqual(imgPos.y2);
    });
  });
});
