import {
  buildModulePanelCompressionAttempts,
  compressModulePanelImage
} from './browser-image-compression';
import {
  buildUploadGuardrailAdvisory,
  MODULE_PANEL_MAX_BYTES,
  MODULE_PANEL_MAX_LONG_EDGE_PX,
  RACK_PREVIEW_MAX_BYTES,
  formatGuardrailBytes,
  getLongEdgePx
} from './upload-guardrails';

describe('upload guardrails', () => {
  const imageBitmapTarget = window as Window & {createImageBitmap?: (blob: Blob) => Promise<ImageBitmap>};
  let previousCreateImageBitmap: typeof imageBitmapTarget.createImageBitmap;

  function installCompressionMocks(encodedBlobs: Blob[]): void {
    const nativeCreateElement = document.createElement.bind(document);
    let encodedIndex = 0;

    imageBitmapTarget.createImageBitmap = jasmine.createSpy('createImageBitmap').and.resolveTo({
      width: MODULE_PANEL_MAX_LONG_EDGE_PX + 1,
      height: 1000,
      close: jasmine.createSpy('close')
    } as ImageBitmap);

    spyOn(document, 'createElement').and.callFake((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: jasmine.createSpy('drawImage')
          } as unknown as CanvasRenderingContext2D),
          toBlob: (callback: BlobCallback) => {
            callback(encodedBlobs[encodedIndex] ?? null);
            encodedIndex += 1;
          }
        } as unknown as HTMLCanvasElement;
      }

      return nativeCreateElement(tagName);
    });
  }

  beforeEach(() => {
    previousCreateImageBitmap = imageBitmapTarget.createImageBitmap;
  });

  afterEach(() => {
    imageBitmapTarget.createImageBitmap = previousCreateImageBitmap;
  });

  it('accepts module panels inside the post-crop limits', () => {
    const advisory = buildUploadGuardrailAdvisory('module-panel', {
      byteSize: MODULE_PANEL_MAX_BYTES,
      widthPx: MODULE_PANEL_MAX_LONG_EDGE_PX,
      heightPx: 1200,
      mimeType: 'image/webp'
    });

    expect(advisory.status).toBe('within-limits');
    expect(advisory.accepted).toBeTrue();
    expect(advisory.requiresConfirmation).toBeFalse();
    expect(advisory.issues).toEqual([]);
  });

  it('requires explicit module panel confirmation when compression remains oversized', () => {
    const advisory = buildUploadGuardrailAdvisory('module-panel', {
      byteSize: MODULE_PANEL_MAX_BYTES + 1,
      widthPx: MODULE_PANEL_MAX_LONG_EDGE_PX + 1,
      heightPx: 1000,
      mimeType: 'image/jpeg'
    });

    expect(advisory.status).toBe('needs-confirmation');
    expect(advisory.accepted).toBeTrue();
    expect(advisory.requiresConfirmation).toBeTrue();
    expect(advisory.issues.map(issue => issue.code)).toEqual(['byte-size', 'long-edge']);
  });

  it('hard-blocks rack previews above one megabyte', () => {
    const advisory = buildUploadGuardrailAdvisory('rack-preview', {
      byteSize: RACK_PREVIEW_MAX_BYTES + 1,
      mimeType: 'image/jpeg'
    });

    expect(advisory.status).toBe('blocked');
    expect(advisory.accepted).toBeFalse();
    expect(advisory.requiresConfirmation).toBeFalse();
    expect(advisory.issues.map(issue => issue.code)).toEqual(['byte-size']);
  });

  it('orders module panel encoding attempts by preferred format before jpeg fallback', () => {
    expect(buildModulePanelCompressionAttempts('image/webp')).toEqual([
      {mimeType: 'image/webp', quality: 95},
      {mimeType: 'image/webp', quality: 90},
      {mimeType: 'image/jpeg', quality: 95},
      {mimeType: 'image/jpeg', quality: 90}
    ]);
    expect(buildModulePanelCompressionAttempts('image/jpeg')).toEqual([
      {mimeType: 'image/jpeg', quality: 95},
      {mimeType: 'image/jpeg', quality: 90}
    ]);
  });

  it('keeps the smallest webp attempt when every module-panel attempt remains oversized', async () => {
    const webp95 = new Blob([new Uint8Array(MODULE_PANEL_MAX_BYTES + 100)], {type: 'image/webp'});
    const webp90 = new Blob([new Uint8Array(MODULE_PANEL_MAX_BYTES + 50)], {type: 'image/webp'});
    const jpeg95 = new Blob([new Uint8Array(MODULE_PANEL_MAX_BYTES + 25)], {type: 'image/jpeg'});
    const jpeg90 = new Blob([new Uint8Array(MODULE_PANEL_MAX_BYTES + 1)], {type: 'image/jpeg'});
    installCompressionMocks([webp95, webp90, jpeg95, jpeg90]);

    const result = await compressModulePanelImage(new Blob(['source'], {type: 'image/png'}), 'image/webp');

    expect(result.blob).toBe(webp90);
    expect(result.attempt).toEqual({mimeType: 'image/webp', quality: 90});
    expect(result.advisory.requiresConfirmation).toBeTrue();
  });

  it('uses jpeg fallback when webp attempts miss but jpeg fits the module-panel limit', async () => {
    const webp95 = new Blob([new Uint8Array(MODULE_PANEL_MAX_BYTES + 100)], {type: 'image/webp'});
    const webp90 = new Blob([new Uint8Array(MODULE_PANEL_MAX_BYTES + 50)], {type: 'image/webp'});
    const jpeg95 = new Blob([new Uint8Array(MODULE_PANEL_MAX_BYTES)], {type: 'image/jpeg'});
    installCompressionMocks([webp95, webp90, jpeg95]);

    const result = await compressModulePanelImage(new Blob(['source'], {type: 'image/png'}), 'image/webp');

    expect(result.blob).toBe(jpeg95);
    expect(result.attempt).toEqual({mimeType: 'image/jpeg', quality: 95});
    expect(result.advisory.status).toBe('within-limits');
  });

  it('formats byte and long-edge measurements for compact warnings', () => {
    expect(formatGuardrailBytes(512 * 1024)).toBe('512 KB');
    expect(formatGuardrailBytes(1536 * 1024)).toBe('1.5 MB');
    expect(getLongEdgePx({byteSize: 1, widthPx: 300, heightPx: 500})).toBe(500);
  });
});
