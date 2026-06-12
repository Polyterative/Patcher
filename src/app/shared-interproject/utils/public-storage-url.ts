import { environment } from 'src/environments/environment';

const PUBLIC_STORAGE_PREFIX = '/storage/v1/object/public/';
const ABSOLUTE_URL_PATTERN = /^(https?:|blob:|data:)/i;

export function getPublicStorageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  if (ABSOLUTE_URL_PATTERN.test(path)) {
    return path;
  }

  return `${ environment.supabase.url.replace(/\/$/, '') }${ PUBLIC_STORAGE_PREFIX }${ bucket }/${ path }`;
}
