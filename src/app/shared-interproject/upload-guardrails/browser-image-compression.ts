import {
  buildUploadGuardrailAdvisory,
  MODULE_PANEL_MAX_BYTES,
  MODULE_PANEL_MAX_LONG_EDGE_PX,
  UploadGuardrailAdvisory
} from './upload-guardrails';

export type ModulePanelUploadMimeType = 'image/webp' | 'image/jpeg';

export interface ModulePanelCompressionAttempt {
  mimeType: ModulePanelUploadMimeType;
  quality: 95 | 90;
}

export interface ModulePanelCompressionResult {
  blob: Blob;
  widthPx: number;
  heightPx: number;
  attempt: ModulePanelCompressionAttempt | null;
  advisory: UploadGuardrailAdvisory;
}

interface DecodedImage {
  image: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

export async function compressModulePanelImage(
  blob: Blob,
  preferredMimeType: ModulePanelUploadMimeType
): Promise<ModulePanelCompressionResult> {
  const image = await decodeImageBlob(blob);
  try {
    if (blob.size <= MODULE_PANEL_MAX_BYTES && image.width <= MODULE_PANEL_MAX_LONG_EDGE_PX && image.height <= MODULE_PANEL_MAX_LONG_EDGE_PX) {
      return {
        blob,
        widthPx: image.width,
        heightPx: image.height,
        attempt: null,
        advisory: buildUploadGuardrailAdvisory('module-panel', {
          byteSize: blob.size,
          widthPx: image.width,
          heightPx: image.height,
          mimeType: blob.type
        })
      };
    }

    const dimensions = fitLongEdge(image.width, image.height, MODULE_PANEL_MAX_LONG_EDGE_PX);
    const attempts = buildModulePanelCompressionAttempts(preferredMimeType);
    let selectedResult: {attempt: ModulePanelCompressionAttempt; blob: Blob} | undefined;
    let preferredOversizedResult: {attempt: ModulePanelCompressionAttempt; blob: Blob} | undefined;
    let fallbackOversizedResult: {attempt: ModulePanelCompressionAttempt; blob: Blob} | undefined;
    for (const attempt of attempts) {
      const encodedBlob = await encodeImage(image.image, dimensions.widthPx, dimensions.heightPx, attempt);
      const encodedResult = {attempt, blob: encodedBlob};
      const isPreferredType = attempt.mimeType === preferredMimeType;

      if (isPreferredType && (!preferredOversizedResult || encodedBlob.size < preferredOversizedResult.blob.size)) {
        preferredOversizedResult = encodedResult;
      }
      if (!isPreferredType && (!fallbackOversizedResult || encodedBlob.size < fallbackOversizedResult.blob.size)) {
        fallbackOversizedResult = encodedResult;
      }

      if (encodedBlob.size <= MODULE_PANEL_MAX_BYTES) {
        selectedResult = encodedResult;
        break;
      }
    }

    selectedResult ??= preferredOversizedResult ?? fallbackOversizedResult;
    if (!selectedResult) {
      throw new Error('Could not prepare upload image compression.');
    }

    return {
      blob: selectedResult.blob,
      widthPx: dimensions.widthPx,
      heightPx: dimensions.heightPx,
      attempt: selectedResult.attempt,
      advisory: buildUploadGuardrailAdvisory('module-panel', {
        byteSize: selectedResult.blob.size,
        widthPx: dimensions.widthPx,
        heightPx: dimensions.heightPx,
        mimeType: selectedResult.blob.type || selectedResult.attempt.mimeType
      })
    };
  } finally {
    image.release();
  }
}

export function buildModulePanelCompressionAttempts(
  preferredMimeType: ModulePanelUploadMimeType
): ModulePanelCompressionAttempt[] {
  if (preferredMimeType === 'image/webp') {
    return [
      {mimeType: 'image/webp', quality: 95},
      {mimeType: 'image/webp', quality: 90},
      {mimeType: 'image/jpeg', quality: 95},
      {mimeType: 'image/jpeg', quality: 90}
    ];
  }

  return [
    {mimeType: 'image/jpeg', quality: 95},
    {mimeType: 'image/jpeg', quality: 90}
  ];
}

function fitLongEdge(widthPx: number, heightPx: number, maxLongEdgePx: number): {widthPx: number; heightPx: number} {
  const longEdge = Math.max(widthPx, heightPx);
  if (longEdge <= maxLongEdgePx) {
    return {widthPx, heightPx};
  }

  const scale = maxLongEdgePx / longEdge;
  return {
    widthPx: Math.max(1, Math.round(widthPx * scale)),
    heightPx: Math.max(1, Math.round(heightPx * scale))
  };
}

async function decodeImageBlob(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    return {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close()
    };
  }

  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  const loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode upload image locally.'));
    };
    image.src = objectUrl;
  });

  return {
    image: loadedImage,
    width: loadedImage.naturalWidth || loadedImage.width,
    height: loadedImage.naturalHeight || loadedImage.height,
    release: () => URL.revokeObjectURL(objectUrl)
  };
}

async function encodeImage(
  image: CanvasImageSource,
  widthPx: number,
  heightPx: number,
  attempt: ModulePanelCompressionAttempt
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not prepare upload image compression.');
  }

  context.drawImage(image, 0, 0, widthPx, heightPx);
  return new Promise((resolve, reject) => {
    canvas.toBlob((encodedBlob) => {
      if (!encodedBlob) {
        reject(new Error(`Could not encode upload image as ${ attempt.mimeType }.`));
        return;
      }
      resolve(encodedBlob);
    }, attempt.mimeType, attempt.quality / 100);
  });
}
