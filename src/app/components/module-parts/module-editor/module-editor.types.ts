import { CropperPosition } from 'ngx-image-cropper';

export type CvSectionKind = 'IN' | 'OUT';
export type PanelCropOutputFormat = 'webp' | 'jpeg';

export interface ValidationFeedback {
  disabledReason: string;
  errorMessage: string;
}

export interface PanelTypeOption {
  name: string;
  value: number;
  id: string;
}

export const PANEL_TYPE_OPTIONS: PanelTypeOption[] = [
  {name: 'Light', value: 1, id: '0'},
  {name: 'Dark', value: 2, id: '1'},
  {name: 'Special edition', value: 3, id: '2'},
  {name: 'Limited edition', value: 4, id: '3'}
];

export const PANEL_CROP_FILL_SCALE = 0.82;

/** Computes the aspect-ratio-preserving fitted crop box centered in the image. */
export function buildFittedPanelCropPosition(
  imagePosition: CropperPosition,
  targetAspectRatio: number
): CropperPosition {
  const imageWidth = imagePosition.x2 - imagePosition.x1;
  const imageHeight = imagePosition.y2 - imagePosition.y1;
  const imageAspectRatio = imageWidth / imageHeight;

  if (imageAspectRatio > targetAspectRatio) {
    const cropHeight = imageHeight;
    const cropWidth = cropHeight * targetAspectRatio;
    const offsetX = (imageWidth - cropWidth) / 2;
    return {
      x1: imagePosition.x1 + offsetX,
      y1: imagePosition.y1,
      x2: imagePosition.x2 - offsetX,
      y2: imagePosition.y2
    };
  }

  const cropWidth = imageWidth;
  const cropHeight = cropWidth / targetAspectRatio;
  const offsetY = (imageHeight - cropHeight) / 2;
  return {
    x1: imagePosition.x1,
    y1: imagePosition.y1 + offsetY,
    x2: imagePosition.x2,
    y2: imagePosition.y2 - offsetY
  };
}

/** Scales a crop box by `scaleFactor` around its center, clamped to image bounds. */
export function scalePanelCropPosition(
  position: CropperPosition,
  scaleFactor: number,
  imagePosition: CropperPosition,
  aspectRatio: number
): CropperPosition {
  const imageWidth = imagePosition.x2 - imagePosition.x1;
  const imageHeight = imagePosition.y2 - imagePosition.y1;
  const currentWidth = position.x2 - position.x1;
  const currentHeight = position.y2 - position.y1;
  const minCropWidth = Math.min(120, imageWidth);
  const minCropHeight = minCropWidth / aspectRatio;
  const maxCropWidth = Math.min(imageWidth, imageHeight * aspectRatio);
  const targetWidth = Math.min(maxCropWidth, Math.max(minCropWidth, currentWidth * scaleFactor));
  const targetHeight = Math.min(imageHeight, Math.max(minCropHeight, currentHeight * scaleFactor));
  const finalWidth = Math.min(targetWidth, targetHeight * aspectRatio);
  const finalHeight = finalWidth / aspectRatio;
  const centerX = (position.x1 + position.x2) / 2;
  const centerY = (position.y1 + position.y2) / 2;
  const halfWidth = finalWidth / 2;
  const halfHeight = finalHeight / 2;

  let x1 = centerX - halfWidth;
  let x2 = centerX + halfWidth;
  let y1 = centerY - halfHeight;
  let y2 = centerY + halfHeight;

  if (x1 < imagePosition.x1) {
    x2 += imagePosition.x1 - x1;
    x1 = imagePosition.x1;
  }
  if (x2 > imagePosition.x2) {
    x1 -= x2 - imagePosition.x2;
    x2 = imagePosition.x2;
  }
  if (y1 < imagePosition.y1) {
    y2 += imagePosition.y1 - y1;
    y1 = imagePosition.y1;
  }
  if (y2 > imagePosition.y2) {
    y1 -= y2 - imagePosition.y2;
    y2 = imagePosition.y2;
  }

  return {x1, y1, x2, y2};
}
