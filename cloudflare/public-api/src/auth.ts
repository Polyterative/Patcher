export type ApiKeyParseResult =
  | { ok: true; rawKey: string; rawKeyBytes: Uint8Array }
  | { ok: false; code: 'missing_authorization' | 'malformed_authorization' };

const API_KEY_PREFIX = 'pk_live_';
const API_KEY_ENCODED_LENGTH = 22;

export function parseApiKeyAuthorization(header: string | null): ApiKeyParseResult {
  if (!header) {
    return { ok: false, code: 'missing_authorization' };
  }

  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) {
    return { ok: false, code: 'malformed_authorization' };
  }

  const rawKey = match[1];
  if (!rawKey.startsWith(API_KEY_PREFIX)) {
    return { ok: false, code: 'malformed_authorization' };
  }

  const encoded = rawKey.slice(API_KEY_PREFIX.length);
  if (encoded.length !== API_KEY_ENCODED_LENGTH || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    return { ok: false, code: 'malformed_authorization' };
  }

  try {
    const rawKeyBytes = decodeBase64Url(encoded);
    return rawKeyBytes.length === 16
      ? { ok: true, rawKey, rawKeyBytes }
      : { ok: false, code: 'malformed_authorization' };
  } catch {
    return { ok: false, code: 'malformed_authorization' };
  }
}

export async function hmacApiKey(rawKeyBytes: Uint8Array, base64Pepper: string): Promise<Uint8Array> {
  const pepperBytes = decodeBase64(base64Pepper);
  if (pepperBytes.length !== 32) {
    throw new Error('API_KEY_PEPPER must decode to exactly 32 bytes');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(pepperBytes),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, toArrayBuffer(rawKeyBytes));
  return new Uint8Array(signature);
}

export function bytesToHex(value: Uint8Array): string {
  return Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('');
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return decodeBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
}

function decodeBase64(value: string): Uint8Array {
  const decoded = atob(value);
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}
