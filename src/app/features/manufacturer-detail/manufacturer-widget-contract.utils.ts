const PATCHER_ORIGIN = 'https://patcher.xyz' as const;
const MAX_SHORT_DESCRIPTION_LENGTH = 180;

export type ManufacturerWidgetPublicId = string | number;

export interface ManufacturerWidgetManufacturerInput {
  readonly id: ManufacturerWidgetPublicId | null | undefined;
  readonly name: string | null | undefined;
  readonly logo?: string | null;
  readonly logoUrl?: string | null;
  readonly logo_url?: string | null;
  readonly logoFilename?: string | null;
  readonly logo_filename?: string | null;
  readonly website?: string | null;
  readonly websiteURL?: string | null;
}

export interface ManufacturerWidgetPanelInput {
  readonly filename?: string | null;
  readonly imageFilename?: string | null;
  readonly image_filename?: string | null;
  readonly imageUrl?: string | null;
  readonly image_url?: string | null;
  readonly url?: string | null;
}

export interface ManufacturerWidgetStandardInput {
  readonly id?: string | number | null;
  readonly name?: string | null;
}

export interface ManufacturerWidgetTagInput {
  readonly name?: string | null;
  readonly label?: string | null;
  readonly tag?: {
    readonly name?: string | null;
    readonly label?: string | null;
  } | null;
}

export interface ManufacturerWidgetModuleInput {
  readonly id?: ManufacturerWidgetPublicId | null;
  readonly publicId?: ManufacturerWidgetPublicId | null;
  readonly public_id?: ManufacturerWidgetPublicId | null;
  readonly name?: string | null;
  readonly hp?: number | null;
  readonly description?: string | null;
  readonly shortDescription?: string | null;
  readonly short_description?: string | null;
  readonly standard?: string | number | ManufacturerWidgetStandardInput | null;
  readonly tags?: readonly (string | ManufacturerWidgetTagInput | null | undefined)[] | null;
  readonly panels?: readonly (ManufacturerWidgetPanelInput | null | undefined)[] | null;
  readonly public?: boolean | null;
  readonly isPublic?: boolean | null;
  readonly is_public?: boolean | null;
  readonly visibility?: string | null;
  readonly manufacturer?: unknown;
  readonly manufacturerId?: ManufacturerWidgetPublicId | null;
  readonly manufacturer_id?: ManufacturerWidgetPublicId | null;
}

export interface ManufacturerWidgetManufacturerContract {
  readonly id: string;
  readonly name: string;
  readonly logoUrl?: string;
  readonly logoFilename?: string;
  readonly canonicalUrl: string;
}

export interface ManufacturerWidgetModuleContract {
  readonly id: string;
  readonly publicId?: string;
  readonly name: string;
  readonly hp?: number;
  readonly shortDescription?: string;
  readonly standard?: string;
  readonly tags: readonly string[];
  readonly panelImageUrl?: string;
  readonly panelImageFilename?: string;
  readonly canonicalUrl: string;
}

export interface ManufacturerWidgetModuleCardContract {
  readonly schemaVersion: 1;
  readonly manufacturer: ManufacturerWidgetManufacturerContract;
  readonly module: ManufacturerWidgetModuleContract;
}

export function serializeManufacturerWidgetModuleCard(
  manufacturer: ManufacturerWidgetManufacturerInput,
  module: ManufacturerWidgetModuleInput
): ManufacturerWidgetModuleCardContract | null {
  if (!isSerializablePublicModule(module)) {
    return null;
  }

  const manufacturerId = normalizeId(manufacturer.id);
  const manufacturerName = normalizeText(manufacturer.name);
  const moduleId = normalizeId(module.id);
  const modulePublicId = normalizeId(module.publicId ?? module.public_id);
  const moduleName = normalizeText(module.name);

  if (!manufacturerId || !manufacturerName || !moduleId || !moduleName) {
    return null;
  }

  const manufacturerContract: ManufacturerWidgetManufacturerContract = omitUndefined({
    id: manufacturerId,
    name: manufacturerName,
    ...normalizeLogo(manufacturer),
    canonicalUrl: `${ PATCHER_ORIGIN }/manufacturers/details/${ encodeURIComponent(manufacturerId) }`,
  });

  const moduleContract: ManufacturerWidgetModuleContract = omitUndefined({
    id: moduleId,
    publicId: modulePublicId && modulePublicId !== moduleId ? modulePublicId : undefined,
    name: moduleName,
    hp: normalizeHp(module.hp),
    shortDescription: normalizeShortDescription(module.shortDescription ?? module.short_description ?? module.description),
    standard: normalizeStandard(module.standard),
    tags: normalizeTags(module.tags),
    ...normalizePanelImage(module.panels),
    canonicalUrl: `${ PATCHER_ORIGIN }/modules/details/${ encodeURIComponent(moduleId) }`,
  });

  return {
    schemaVersion: 1,
    manufacturer: manufacturerContract,
    module: moduleContract,
  };
}

function isSerializablePublicModule(module: ManufacturerWidgetModuleInput): boolean {
  const visibility = normalizeText(module.visibility)?.toLowerCase();
  if (visibility && ['private', 'draft', 'hidden', 'archived'].includes(visibility)) {
    return false;
  }

  const publicFlags = [module.public, module.isPublic, module.is_public]
    .filter((flag): flag is boolean => flag !== null && flag !== undefined);

  return publicFlags.length > 0 && publicFlags.every(Boolean);
}

function normalizeLogo(manufacturer: ManufacturerWidgetManufacturerInput): Pick<ManufacturerWidgetManufacturerContract, 'logoUrl' | 'logoFilename'> {
  const logoValue = normalizeText(manufacturer.logoUrl ?? manufacturer.logo_url ?? manufacturer.logo);
  const filenameValue = normalizeText(manufacturer.logoFilename ?? manufacturer.logo_filename);

  if (logoValue && isAbsoluteUrl(logoValue)) {
    return { logoUrl: logoValue };
  }

  return omitUndefined({
    logoUrl: undefined,
    logoFilename: filenameValue ?? logoValue,
  });
}

function normalizePanelImage(
  panels: ManufacturerWidgetModuleInput['panels']
): Pick<ManufacturerWidgetModuleContract, 'panelImageUrl' | 'panelImageFilename'> {
  const panel = panels?.find(candidate => !!candidate && !!(
    normalizeText(candidate.imageUrl ?? candidate.image_url ?? candidate.url)
    ?? normalizeText(candidate.imageFilename ?? candidate.image_filename ?? candidate.filename)
  ));
  if (!panel) {
    return {};
  }

  const url = normalizeText(panel.imageUrl ?? panel.image_url ?? panel.url);
  if (url) {
    return { panelImageUrl: url };
  }

  const filename = normalizeText(panel.imageFilename ?? panel.image_filename ?? panel.filename);
  if (!filename) {
    return {};
  }

  return isAbsoluteUrl(filename)
    ? { panelImageUrl: filename }
    : { panelImageFilename: filename };
}

function normalizeTags(tags: ManufacturerWidgetModuleInput['tags']): readonly string[] {
  const seen = new Set<string>();
  const normalizedTags: string[] = [];

  for (const tag of tags ?? []) {
    const name = typeof tag === 'string'
      ? normalizeText(tag)
      : normalizeText(tag?.tag?.name ?? tag?.tag?.label ?? tag?.name ?? tag?.label);

    if (!name || seen.has(name.toLowerCase())) {
      continue;
    }

    seen.add(name.toLowerCase());
    normalizedTags.push(name);
  }

  return normalizedTags;
}

function normalizeStandard(standard: ManufacturerWidgetModuleInput['standard']): string | undefined {
  if (typeof standard === 'string') {
    return normalizeText(standard);
  }

  if (typeof standard === 'number') {
    return standardLabel(standard);
  }

  const standardName = normalizeText(standard?.name);
  if (standardName) {
    return standardName;
  }

  const standardId = typeof standard?.id === 'string' ? Number(standard.id) : standard?.id;
  return typeof standardId === 'number' ? standardLabel(standardId) : undefined;
}

function standardLabel(standardId: number): string | undefined {
  switch (standardId) {
    case 0:
      return 'Eurorack 3U';
    case 1:
      return 'Intellijel 1U';
    case 2:
      return 'Pulp Logic 1U';
    default:
      return undefined;
  }
}

function normalizeShortDescription(value: string | null | undefined): string | undefined {
  const normalized = normalizeText(value?.replace(/<[^>]*>/g, ' '));
  if (!normalized) {
    return undefined;
  }

  return normalized.length > MAX_SHORT_DESCRIPTION_LENGTH
    ? `${ normalized.slice(0, MAX_SHORT_DESCRIPTION_LENGTH - 1).trimEnd() }…`
    : normalized;
}

function normalizeHp(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function normalizeId(value: ManufacturerWidgetPublicId | null | undefined): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  return normalizeText(String(value));
}

function normalizeText(value: string | null | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  Object.keys(value).forEach(key => {
    if (value[key] === undefined) {
      delete value[key];
    }
  });
  return value;
}
