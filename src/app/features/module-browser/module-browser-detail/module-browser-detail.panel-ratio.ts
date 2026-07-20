import { getModulePanelAspectRatio } from 'src/app/components/module-parts/get-module-height-for-standard.pipe';
import { getModulePanelPublicUrl } from 'src/app/features/backend/supabase-storage';
import { DbModule } from 'src/app/models/module';

export const MODULE_PANEL_RATIO_ACCEPTANCE_THRESHOLD = 0.01;

export interface PanelImageDimensions {
  width: number;
  height: number;
}

export interface ModulePanelRatioResult {
  expectedRatio: number;
  imageRatio: number;
  relativeDelta: number;
  deltaPercent: number;
  accepted: boolean;
}

export interface ModulePanelRatioDiagnostic {
  panelId: number;
  label: string;
  filename: string;
  expectedRatio: number;
  status: 'pending' | 'match' | 'mismatch' | 'unavailable' | 'error';
  imageWidth?: number;
  imageHeight?: number;
  imageRatio?: number;
  deltaPercent?: number;
  accepted?: boolean;
  error?: string;
}

export function calculateModulePanelRatioResult(
  module: Pick<DbModule, 'hp' | 'standard'>,
  dimensions: PanelImageDimensions,
  threshold = MODULE_PANEL_RATIO_ACCEPTANCE_THRESHOLD
): ModulePanelRatioResult | null {
  if (!Number.isFinite(module.hp) || module.hp <= 0 || !Number.isFinite(dimensions.width) || !Number.isFinite(dimensions.height) || dimensions.width <= 0 || dimensions.height <= 0) {
    return null;
  }

  const expectedRatio = getModulePanelAspectRatio(module);
  const imageRatio = dimensions.width / dimensions.height;
  const relativeDelta = (imageRatio - expectedRatio) / expectedRatio;

  return {
    expectedRatio,
    imageRatio,
    relativeDelta,
    deltaPercent: relativeDelta * 100,
    accepted: Math.abs(relativeDelta) <= threshold
  };
}

export function createInitialPanelRatioDiagnostics(module: DbModule): ModulePanelRatioDiagnostic[] {
  return module.panels.map((panel, index): ModulePanelRatioDiagnostic => ({
    panelId: panel.id,
    label: `Panel ${ index + 1 }`,
    filename: panel.filename,
    expectedRatio: getModulePanelAspectRatio(module),
    status: panel.filename ? 'pending' : 'unavailable',
    error: panel.filename ? undefined : 'No filename'
  }));
}

export function createMeasuredPanelRatioDiagnostic(
  module: DbModule,
  panelId: number,
  filename: string,
  label: string,
  dimensions: PanelImageDimensions,
  threshold = MODULE_PANEL_RATIO_ACCEPTANCE_THRESHOLD
): ModulePanelRatioDiagnostic {
  const result = calculateModulePanelRatioResult(module, dimensions, threshold);

  return {
    panelId,
    label,
    filename,
    expectedRatio: result?.expectedRatio ?? getModulePanelAspectRatio(module),
    status: result?.accepted ? 'match' : 'mismatch',
    imageWidth: dimensions.width,
    imageHeight: dimensions.height,
    imageRatio: result?.imageRatio,
    deltaPercent: result?.deltaPercent,
    accepted: result?.accepted
  };
}

export function measurePanelImage(filename: string): Promise<PanelImageDimensions> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.referrerPolicy = 'no-referrer';
    image.onload = () => resolve({
      width: image.naturalWidth,
      height: image.naturalHeight
    });
    image.onerror = () => reject(new Error('Panel image failed to load'));
    image.src = getModulePanelPublicUrl(filename);
  });
}
