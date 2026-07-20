export const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/u;
export const MAX_TITLE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_EXTERNAL_LINK_LENGTH = 2048;
export const MAX_MEDIA_URL_LENGTH = 2048;
export const MAX_MEDIA_FILENAME_LENGTH = 255;
export const MAX_SHIPPING_NOTES_LENGTH = 500;

export function trimOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

export function stringInput(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function priceInput(value: unknown): string | number | undefined {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
