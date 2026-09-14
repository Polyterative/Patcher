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
    it('is a growth factor above 1 so Fill converges on the full frame', () => {
      expect(PANEL_CROP_FILL_SCALE).toBe(1.22);
    });
  });

  describe('buildFittedPanelCropPosition', () => {
    it('returns a cropped position with correct structure', () => {
      const imagePosition = makeImagePosition();
      const result = buildFittedPanelCropPosition(imagePosition, 1.0);
      expect(result).toEqual(jasmine.objectContaining({ x1: jasmine.any(Number), y1: jasmine.any(Number), x2: jasmine.any(Number), y2: jasmine.any(Number) }));
    });

    it('returns the full frame when the image already matches the target ratio', () => {
      // Stephan report regression: 14HP 3U panel at exactly 14/25.4 must not be cropped.
      const aspectRatio = 14 / 25.4;
      const result = buildFittedPanelCropPosition({x1: 0, y1: 0, x2: 1400, y2: 2540}, aspectRatio);
      expect(result.x1).toBeCloseTo(0, 6);
      expect(result.y1).toBeCloseTo(0, 6);
      expect(result.x2).toBeCloseTo(1400, 6);
      expect(result.y2).toBeCloseTo(2540, 6);
    });

    it('preserves a non-zero image origin when fitting', () => {
      const result = buildFittedPanelCropPosition({x1: 100, y1: 50, x2: 500, y2: 350}, 1.0);
      expect(result.x1).toBeCloseTo(150, 6);
      expect(result.y1).toBeCloseTo(50, 6);
      expect(result.x2).toBeCloseTo(450, 6);
      expect(result.y2).toBeCloseTo(350, 6);
    });

    it('matches the target aspect ratio for wide images', () => {
      const result = buildFittedPanelCropPosition({x1: 0, y1: 0, x2: 400, y2: 200}, 1.0);
      expect((result.x2 - result.x1) / (result.y2 - result.y1)).toBeCloseTo(1.0, 6);
    });

    it('matches the target aspect ratio for tall images', () => {
      const result = buildFittedPanelCropPosition({x1: 0, y1: 0, x2: 200, y2: 400}, 2.0);
      expect((result.x2 - result.x1) / (result.y2 - result.y1)).toBeCloseTo(2.0, 6);
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

    it('preserves the target aspect ratio when scaling', () => {
      const result = scalePanelCropPosition(
        makeImagePosition(50, 50, 200, 200),
        1.5,
        makeImagePosition(0, 0, 400, 400),
        1.0
      );
      expect((result.x2 - result.x1) / (result.y2 - result.y1)).toBeCloseTo(1.0, 6);
    });

    it('keeps the crop centered on the previous selection', () => {
      const result = scalePanelCropPosition(
        makeImagePosition(50, 50, 350, 350),
        0.5,
        makeImagePosition(0, 0, 400, 400),
        1.0
      );
      expect(result.x1).toBeCloseTo(125, 6);
      expect(result.y1).toBeCloseTo(125, 6);
      expect(result.x2).toBeCloseTo(275, 6);
      expect(result.y2).toBeCloseTo(275, 6);
    });

    it('clamps enlargement to the full image bounds', () => {
      const imgPos = makeImagePosition(0, 0, 400, 400);
      const result = scalePanelCropPosition(imgPos, 2.0, imgPos, 1.0);
      expect(result.x1).toBeCloseTo(0, 6);
      expect(result.y1).toBeCloseTo(0, 6);
      expect(result.x2).toBeCloseTo(400, 6);
      expect(result.y2).toBeCloseTo(400, 6);
    });

    it('clamps shrinking to the minimum crop size', () => {
      const imgPos = makeImagePosition(0, 0, 400, 400);
      const result = scalePanelCropPosition(imgPos, 0.01, imgPos, 1.0);
      expect(result.x2 - result.x1).toBeCloseTo(120, 6);
      expect(result.y2 - result.y1).toBeCloseTo(120, 6);
      expect((result.x1 + result.x2) / 2).toBeCloseTo(200, 6);
      expect((result.y1 + result.y2) / 2).toBeCloseTo(200, 6);
    });

    it('keeps the full frame when Fill runs on a perfect-ratio 14HP panel', () => {
      const aspectRatio = 14 / 25.4;
      const imagePosition = {x1: 0, y1: 0, x2: 1400, y2: 2540};
      const fitted = buildFittedPanelCropPosition(imagePosition, aspectRatio);
      const result = scalePanelCropPosition(fitted, PANEL_CROP_FILL_SCALE, imagePosition, aspectRatio);
      expect(result.x1).toBeCloseTo(0, 4);
      expect(result.y1).toBeCloseTo(0, 4);
      expect(result.x2).toBeCloseTo(1400, 4);
      expect(result.y2).toBeCloseTo(2540, 4);
    });

    it('grows a smaller selection toward the frame on Fill', () => {
      const imagePosition = {x1: 0, y1: 0, x2: 400, y2: 400};
      const result = scalePanelCropPosition(
        {x1: 50, y1: 50, x2: 350, y2: 350},
        PANEL_CROP_FILL_SCALE,
        imagePosition,
        1.0
      );
      expect(result.x1).toBeCloseTo(17, 4);
      expect(result.y1).toBeCloseTo(17, 4);
      expect(result.x2).toBeCloseTo(383, 4);
      expect(result.y2).toBeCloseTo(383, 4);
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
