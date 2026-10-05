import {
  buildModulePanelCompressionAttempts,
  compressModulePanelImage
} from './browser-image-compression';
import {
  MODULE_PANEL_MAX_BYTES,
  MODULE_PANEL_MAX_LONG_EDGE_PX
} from './upload-guardrails';

async function makeImage(width: number, height: number, mimeType = 'image/png', noisy = false): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;
  if (noisy) {
    const data = context.createImageData(width, height);
    let seed = 12345;
    for (let i = 0; i < data.data.length; i += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data.data[i] = i % 4 === 3 ? 255 : seed >>> 24;
    }
    context.putImageData(data, 0, 0);
  } else {
    context.fillStyle = '#336699';
    context.fillRect(0, 0, width, height);
  }
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('encode failed')), mimeType)
  );
}

describe('compressModulePanelImage', () => {
  describe('attempt ladder', () => {
    it('tries webp 95/90 then jpeg 95/90 when webp is preferred', () => {
      expect(buildModulePanelCompressionAttempts('image/webp')).toEqual([
        {mimeType: 'image/webp', quality: 95},
        {mimeType: 'image/webp', quality: 90},
        {mimeType: 'image/jpeg', quality: 95},
        {mimeType: 'image/jpeg', quality: 90}
      ]);
    });

    it('only tries jpeg when jpeg is preferred, never upgrading to webp', () => {
      expect(buildModulePanelCompressionAttempts('image/jpeg')).toEqual([
        {mimeType: 'image/jpeg', quality: 95},
        {mimeType: 'image/jpeg', quality: 90}
      ]);
    });

    it('returns a fresh array each call', () => {
      expect(buildModulePanelCompressionAttempts('image/webp')).not.toBe(buildModulePanelCompressionAttempts('image/webp'));
    });
  });

  describe('already within limits', () => {
    it('returns the original blob untouched with no attempt and a clean advisory', async () => {
      const blob = await makeImage(300, 200);
      expect(blob.size).toBeLessThanOrEqual(MODULE_PANEL_MAX_BYTES);

      const result = await compressModulePanelImage(blob, 'image/webp');

      expect(result.blob).toBe(blob);
      expect(result.attempt).toBeNull();
      expect(result.widthPx).toBe(300);
      expect(result.heightPx).toBe(200);
      expect(result.advisory.status).toBe('within-limits');
      expect(result.advisory.measurement.mimeType).toBe('image/png');
    });

    it('keeps a 1x1 image as-is', async () => {
      const result = await compressModulePanelImage(await makeImage(1, 1), 'image/jpeg');
      expect(result.widthPx).toBe(1);
      expect(result.heightPx).toBe(1);
      expect(result.attempt).toBeNull();
    });

    it('does not resize an image exactly at the long-edge limit', async () => {
      const blob = await makeImage(MODULE_PANEL_MAX_LONG_EDGE_PX, 10);
      const result = await compressModulePanelImage(blob, 'image/webp');
      expect(result.widthPx).toBe(MODULE_PANEL_MAX_LONG_EDGE_PX);
      expect(result.attempt).toBeNull();
    });
  });

  describe('downscaling', () => {
    it('shrinks a too-wide image to the long edge while preserving aspect ratio', async () => {
      const result = await compressModulePanelImage(await makeImage(6000, 3000), 'image/webp');
      expect(result.widthPx).toBe(MODULE_PANEL_MAX_LONG_EDGE_PX);
      expect(result.heightPx).toBe(2500);
      expect(result.attempt).not.toBeNull();
      expect(result.advisory.status).toBe('within-limits');
    });

    it('shrinks a too-tall image using the height as the long edge', async () => {
      const result = await compressModulePanelImage(await makeImage(1500, 7500), 'image/jpeg');
      expect(result.heightPx).toBe(MODULE_PANEL_MAX_LONG_EDGE_PX);
      expect(result.widthPx).toBe(1000);
    });

    it('never produces a zero-pixel dimension for extreme aspect ratios', async () => {
      const result = await compressModulePanelImage(await makeImage(10000, 1), 'image/jpeg');
      expect(result.widthPx).toBe(MODULE_PANEL_MAX_LONG_EDGE_PX);
      expect(result.heightPx).toBe(1);
    });

    it('re-encodes with the preferred format and reports it', async () => {
      const webp = await compressModulePanelImage(await makeImage(5200, 100), 'image/webp');
      expect(webp.attempt?.mimeType).toBe('image/webp');
      expect(webp.blob.type).toBe('image/webp');

      const jpeg = await compressModulePanelImage(await makeImage(5200, 100), 'image/jpeg');
      expect(jpeg.attempt?.mimeType).toBe('image/jpeg');
      expect(jpeg.blob.type).toBe('image/jpeg');
    });

    it('stops at the first attempt that fits instead of trying every quality', async () => {
      const result = await compressModulePanelImage(await makeImage(5200, 100), 'image/webp');
      expect(result.attempt).toEqual({mimeType: 'image/webp', quality: 95});
    });
  });

  describe('oversize results', () => {
    it('re-encodes a heavy image and, when it still does not fit, asks for confirmation rather than failing', async () => {
      const heavy = await makeImage(1500, 1500, 'image/png', true);
      expect(heavy.size).toBeGreaterThan(MODULE_PANEL_MAX_BYTES);

      const result = await compressModulePanelImage(heavy, 'image/jpeg');

      expect(result.attempt).not.toBeNull();
      expect(result.blob.size).toBeGreaterThan(0);
      if (result.blob.size > MODULE_PANEL_MAX_BYTES) {
        expect(result.advisory.status).toBe('needs-confirmation');
        expect(result.advisory.accepted).toBeTrue();
        expect(result.advisory.requiresConfirmation).toBeTrue();
        expect(result.attempt).toEqual({mimeType: 'image/jpeg', quality: 90});
      } else {
        expect(result.advisory.status).toBe('within-limits');
      }
      expect(result.advisory.measurement.byteSize).toBe(result.blob.size);
    }, 30000);
  });

  describe('failure handling', () => {
    it('rejects when the blob is not a decodable image', async () => {
      await expectAsync(compressModulePanelImage(new Blob(['not an image'], {type: 'image/png'}), 'image/webp')).toBeRejected();
    });

    it('rejects for an empty blob', async () => {
      await expectAsync(compressModulePanelImage(new Blob([], {type: 'image/png'}), 'image/webp')).toBeRejected();
    });

    it('rejects for an HTML payload pretending to be an image', async () => {
      const html = new Blob(['<html><script>alert(1)</script></html>'], {type: 'image/png'});
      await expectAsync(compressModulePanelImage(html, 'image/jpeg')).toBeRejected();
    });

    it('releases the decoded bitmap even when encoding throws', async () => {
      const wide = await makeImage(6000, 100);
      const closeSpy = jasmine.createSpy('close');
      const realCreate = window.createImageBitmap.bind(window);
      spyOn(window, 'createImageBitmap').and.callFake(async (...args: unknown[]) => {
        const bitmap = await (realCreate as (...a: unknown[]) => Promise<ImageBitmap>)(...args);
        const original = bitmap.close.bind(bitmap);
        bitmap.close = () => { closeSpy(); original(); };
        return bitmap;
      });
      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake((callback: BlobCallback) => callback(null));

      await expectAsync(compressModulePanelImage(wide, 'image/webp')).toBeRejected();
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('releases the decoded bitmap on the happy path too', async () => {
      const closeSpy = jasmine.createSpy('close');
      const realCreate = window.createImageBitmap.bind(window);
      spyOn(window, 'createImageBitmap').and.callFake(async (...args: unknown[]) => {
        const bitmap = await (realCreate as (...a: unknown[]) => Promise<ImageBitmap>)(...args);
        const original = bitmap.close.bind(bitmap);
        bitmap.close = () => { closeSpy(); original(); };
        return bitmap;
      });

      await compressModulePanelImage(await makeImage(50, 50), 'image/webp');
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects with a clear message when the browser cannot encode any attempt', async () => {
      const wide = await makeImage(6000, 100);
      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake((callback: BlobCallback) => callback(null));
      await expectAsync(compressModulePanelImage(wide, 'image/webp'))
        .toBeRejectedWithError(/Could not encode upload image/);
    });

    it('rejects when no 2d canvas context is available', async () => {
      const blob = await makeImage(6000, 100);
      spyOn(HTMLCanvasElement.prototype, 'getContext').and.returnValue(null);
      await expectAsync(compressModulePanelImage(blob, 'image/webp'))
        .toBeRejectedWithError('Could not prepare upload image compression.');
    });
  });
});
