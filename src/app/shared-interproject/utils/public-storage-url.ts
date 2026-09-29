import { environment } from 'src/environments/environment';

const PUBLIC_STORAGE_PREFIX = '/storage/v1/object/public/';
const PUBLIC_IMAGE_PROXY_BASE = 'https://images.patcher.xyz/';
const IMAGE_PROXY_BUCKETS = new Set(['module-collections']);
const ABSOLUTE_URL_PATTERN = /^(https?:|blob:|data:)/i;

export function getPublicStorageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  if (ABSOLUTE_URL_PATTERN.test(path)) {
    return path;
  }

  const encodedPath = path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

  if (IMAGE_PROXY_BUCKETS.has(bucket)) {
    return `${ PUBLIC_IMAGE_PROXY_BASE }${ encodeURIComponent(bucket) }/${ encodedPath }`;
  }

  return `${ environment.supabase.url.replace(/\/$/, '') }${ PUBLIC_STORAGE_PREFIX }${ encodeURIComponent(bucket) }/${ encodedPath }`;
}
