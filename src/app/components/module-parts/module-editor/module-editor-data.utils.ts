import { CV } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';

// --- Panel analysis constants ---

const PANEL_ANALYSIS_MAX_EDGE = 192;
const COLORFUL_PIXEL_SATURATION_THRESHOLD = 0.22;
const SPECIAL_EDITION_COLORFUL_PIXEL_RATIO_THRESHOLD = 0.18;
const SPECIAL_EDITION_AVERAGE_SATURATION_THRESHOLD = 0.16;
const DARK_PANEL_LUMINANCE_THRESHOLD = 0.45;

// --- Types ---

export interface PanelAppearanceMetrics {
  averageLuminance: number;
  averageSaturation: number;
  colorfulPixelRatio: number;
}

export type DecodedPanelImage = ImageBitmap | HTMLImageElement;

// --- CV comparison ---

export function toComparableCv(cv: CV): {
  id: number;
  name: string;
  min: number | null;
  max: number | null;
  isApproved: boolean;
} {
  return {
    id: cv?.id ?? 0,
    name: (cv?.name ?? '').trim(),
    min: cv?.min ?? null,
    max: cv?.max ?? null,
    isApproved: cv?.isApproved ?? false
  };
}

export function areCvListsEqual(a: CV[], b: CV[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((cv, i) => {
    const left = toComparableCv(cv);
    const right = toComparableCv(b[i]);
    return left.id === right.id
      && left.name === right.name
      && left.min === right.min
      && left.max === right.max
      && left.isApproved === right.isApproved;
  });
}

export function hasInsOutsChanges(ins: CV[], outs: CV[], module: DbModule): boolean {
  const existingIns = module?.ins ?? [];
  const existingOuts = module?.outs ?? [];
  return !areCvListsEqual(ins, existingIns) || !areCvListsEqual(outs, existingOuts);
}

// --- File name utilities ---

export function fileExtensionFromName(filename: string | undefined): string {
  if (!filename || !filename.includes('.')) {
    return '';
  }
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

export function stripFileExtension(filename: string | undefined): string {
  if (!filename) {
    return '';
  }
  return filename.replace(/\.[^.]+$/, '');
}

export function fileExtensionFromType(fileType: string | undefined): string {
  const normalizedType = (fileType || '').toLowerCase();
  if (!normalizedType) {
    return '';
  }
  if (normalizedType === 'image/jpeg') {
    return 'jpg';
  }
  return normalizedType.split('/').pop() ?? '';
}

export function safeString(str: string | undefined): string {
  return (str || '').replace(/[^a-z0-9]/gi, '_');
}

// --- Panel image analysis ---

export function measurePanelAppearance(data: Uint8ClampedArray): PanelAppearanceMetrics {
  let totalLuminance = 0;
  let totalSaturation = 0;
  let colorfulPixels = 0;
  let opaquePixels = 0;

  for (let i = 0; i < data.length; i += 16) {
    const alpha = data[i + 3] / 255;
    if (alpha < 0.5) {
      continue;
    }

    const red = data[i] / 255;
    const green = data[i + 1] / 255;
    const blue = data[i + 2] / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
    const saturation = max === 0 ? 0 : (max - min) / max;

    totalLuminance += luminance;
    totalSaturation += saturation;
    if (saturation > COLORFUL_PIXEL_SATURATION_THRESHOLD) {
      colorfulPixels++;
    }
    opaquePixels++;
  }

  if (opaquePixels === 0) {
    return {
      averageLuminance: 1,
      averageSaturation: 0,
      colorfulPixelRatio: 0
    };
  }

  return {
    averageLuminance: totalLuminance / opaquePixels,
    averageSaturation: totalSaturation / opaquePixels,
    colorfulPixelRatio: colorfulPixels / opaquePixels
  };
}

export function classifyPanelType(metrics: PanelAppearanceMetrics): number {
  if (
    metrics.colorfulPixelRatio > SPECIAL_EDITION_COLORFUL_PIXEL_RATIO_THRESHOLD
    || metrics.averageSaturation > SPECIAL_EDITION_AVERAGE_SATURATION_THRESHOLD
  ) {
    return 3;
  }

  return metrics.averageLuminance < DARK_PANEL_LUMINANCE_THRESHOLD ? 2 : 1;
}

export function loadImageElement(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('Could not decode panel image locally.'));
    };
    image.src = objectUrl;
  });
}

export function releaseDecodedPanelImage(image: DecodedPanelImage): void {
  if ('close' in image && typeof image.close === 'function') {
    image.close();
  }
}

export function getPanelAnalysisDimensions(width: number, height: number): {width: number; height: number} {
  const maxEdge = Math.max(width, height);
  if (maxEdge <= PANEL_ANALYSIS_MAX_EDGE) {
    return {width, height};
  }

  const scale = PANEL_ANALYSIS_MAX_EDGE / maxEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

export async function decodePanelImage(blob: Blob): Promise<DecodedPanelImage> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob);
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    return await loadImageElement(objectUrl);
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error('Could not decode panel image locally.');
  }
}

export async function readImageDataFromBlob(blob: Blob): Promise<ImageData> {
  const image = await decodePanelImage(blob);
  const canvas = document.createElement('canvas');
  const dimensions = getPanelAnalysisDimensions(image.width, image.height);
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d');

  if (!context) {
    releaseDecodedPanelImage(image);
    throw new Error('Could not prepare panel image analysis.');
  }

  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  releaseDecodedPanelImage(image);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}
