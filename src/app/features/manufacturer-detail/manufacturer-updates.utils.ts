export const MANUFACTURER_UPDATE_TITLE_MAX_LENGTH = 120;
export const MANUFACTURER_UPDATE_BODY_MAX_LENGTH = 1000;
export const MANUFACTURER_FEATURED_MODULE_LIMIT = 6;

export interface ManufacturerUpdateDraft {
  manufacturerId: string;
  title: string;
  body: string;
  linkedModuleId?: string;
  expiresAt?: string;
  featuredModuleIds?: readonly string[];
}

export type ManufacturerUpdateDraftValidationError =
  | 'manufacturer_id_required'
  | 'title_required'
  | 'title_too_long'
  | 'body_required'
  | 'body_too_long'
  | 'expires_at_invalid'
  | 'expires_at_must_be_future';

export type ManufacturerUpdateDraftValidationResult =
  | {
      valid: true;
      update: ManufacturerUpdateDraft;
    }
  | {
      valid: false;
      errors: ManufacturerUpdateDraftValidationError[];
    };

export function validateManufacturerUpdateDraft(
  input: unknown,
  now: string | Date | number = Date.now()
): ManufacturerUpdateDraftValidationResult {
  const draft = asUpdateDraftRecord(input);
  const manufacturerId = normalizeRequiredText(draft?.manufacturerId);
  const title = normalizeRequiredText(draft?.title);
  const body = normalizeRequiredText(draft?.body);
  const linkedModuleId = normalizeOptionalText(draft?.linkedModuleId);
  const featuredModuleIds = normalizeFeaturedModuleIds(draft?.featuredModuleIds);
  const expiresAtResult = normalizeFutureExpiresAt(draft?.expiresAt, now);
  const errors: ManufacturerUpdateDraftValidationError[] = [];

  if (!manufacturerId) {
    errors.push('manufacturer_id_required');
  }

  if (!title) {
    errors.push('title_required');
  } else if (title.length > MANUFACTURER_UPDATE_TITLE_MAX_LENGTH) {
    errors.push('title_too_long');
  }

  if (!body) {
    errors.push('body_required');
  } else if (body.length > MANUFACTURER_UPDATE_BODY_MAX_LENGTH) {
    errors.push('body_too_long');
  }

  if (expiresAtResult.error) {
    errors.push(expiresAtResult.error);
  }

  if (errors.length > 0 || !manufacturerId || !title || !body) {
    return {
      errors,
      valid: false
    };
  }

  return {
    update: {
      body,
      ...(expiresAtResult.expiresAt ? { expiresAt: expiresAtResult.expiresAt } : {}),
      ...(featuredModuleIds.length > 0 ? { featuredModuleIds } : {}),
      ...(linkedModuleId ? { linkedModuleId } : {}),
      manufacturerId,
      title
    },
    valid: true
  };
}

export function normalizeFeaturedModuleIds(input: unknown): readonly string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set<string>();
  const normalizedIds: string[] = [];

  for (const value of input) {
    if (typeof value !== 'string') {
      continue;
    }

    const id = value.trim();
    const key = id.toLowerCase();

    if (!id || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalizedIds.push(id);

    if (normalizedIds.length >= MANUFACTURER_FEATURED_MODULE_LIMIT) {
      break;
    }
  }

  return normalizedIds;
}

function asUpdateDraftRecord(value: unknown): Partial<Record<keyof ManufacturerUpdateDraft, unknown>> | null {
  return value !== null && typeof value === 'object'
    ? value as Partial<Record<keyof ManufacturerUpdateDraft, unknown>>
    : null;
}

function normalizeRequiredText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalText(value: unknown): string | undefined {
  return normalizeRequiredText(value) ?? undefined;
}

function normalizeFutureExpiresAt(
  value: unknown,
  now: string | Date | number
): { expiresAt?: string; error?: Extract<ManufacturerUpdateDraftValidationError, 'expires_at_invalid' | 'expires_at_must_be_future'> } {
  if (value === null || value === undefined || value === '') {
    return {};
  }

  const expiresAtMs = parseTime(value);
  const nowMs = parseTime(now);

  if (expiresAtMs === null || nowMs === null) {
    return { error: 'expires_at_invalid' };
  }

  if (expiresAtMs <= nowMs) {
    return { error: 'expires_at_must_be_future' };
  }

  return { expiresAt: new Date(expiresAtMs).toISOString() };
}

function parseTime(value: unknown): number | null {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const ms = typeof value === 'number' ? value : Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }

  return null;
}
