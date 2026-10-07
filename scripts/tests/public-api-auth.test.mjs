import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { bytesToHex, hmacApiKey, parseApiKeyAuthorization } from '../../cloudflare/public-api/src/auth.ts';

const bytes = Uint8Array.from({ length: 16 }, (_, i) => i * 7 + 1);
const encoded = Buffer.from(bytes).toString('base64url');
const rawKey = `pk_live_${encoded}`;

test('accepts a well-formed key and returns the exact 16 bytes', () => {
  const result = parseApiKeyAuthorization(`Bearer ${rawKey}`);
  assert.equal(result.ok, true);
  assert.deepEqual(Array.from(result.rawKeyBytes), Array.from(bytes));
  assert.equal(result.rawKey, rawKey);
});

test('scheme is case-insensitive and surrounding whitespace is tolerated, but extra tokens are not', () => {
  for (const header of [`bearer ${rawKey}`, `BEARER ${rawKey}`, `  Bearer ${rawKey}  `, `Bearer\t${rawKey}`, `Bearer    ${rawKey}`]) {
    assert.equal(parseApiKeyAuthorization(header).ok, true, JSON.stringify(header));
  }
  for (const header of [`Bearer ${rawKey} extra`, `Bearer ${rawKey},Bearer ${rawKey}`, `Bearer ${rawKey}\nBearer ${rawKey}`]) {
    assert.deepEqual(parseApiKeyAuthorization(header), { ok: false, code: 'malformed_authorization' }, JSON.stringify(header));
  }
});

test('missing header yields missing_authorization, everything else malformed', () => {
  for (const header of [null, '']) {
    assert.deepEqual(parseApiKeyAuthorization(header), { ok: false, code: 'missing_authorization' });
  }
  for (const header of [
    ' ', 'Bearer', 'Bearer ', rawKey, `Basic ${rawKey}`, `Token ${rawKey}`, `Bearer${rawKey}`, `Bearer: ${rawKey}`,
    `Bearer "${rawKey}"`, `Bearer ${rawKey}=`,
  ]) {
    assert.deepEqual(parseApiKeyAuthorization(header), { ok: false, code: 'malformed_authorization' }, JSON.stringify(header));
  }
});

test('prefix, length and alphabet are enforced exactly', () => {
  const bad = [
    `pk_test_${encoded}`, `PK_LIVE_${encoded}`, `pk_live${encoded}`, `pk_live_`, `pk_live_${encoded.slice(1)}`,
    `pk_live_${encoded}A`, `pk_live_${encoded.slice(0, 21)}+`, `pk_live_${encoded.slice(0, 21)}/`,
    `pk_live_${encoded.slice(0, 21)}=`, `pk_live_${encoded.slice(0, 21)}é`, `pk_live_${encoded.slice(0, 21)} `,
    `pk_live_${'A'.repeat(21)}`, `pk_live_${'A'.repeat(23)}`, `sk_live_${encoded}`,
  ];
  for (const key of bad) {
    assert.equal(parseApiKeyAuthorization(`Bearer ${key}`).ok, false, key);
  }
});

test('overlong and binary-ish headers are rejected without throwing', () => {
  for (const header of ['Bearer ' + 'a'.repeat(100_000), 'Bearer \u0000\u0001', 'Bearer pk_live_' + '\u{1F600}'.repeat(11)]) {
    assert.doesNotThrow(() => parseApiKeyAuthorization(header));
    assert.equal(parseApiKeyAuthorization(header).ok, false);
  }
});

test('different valid keys never parse to the same bytes', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i += 1) {
    const key = `pk_live_${randomBytes(16).toString('base64url')}`;
    const result = parseApiKeyAuthorization(`Bearer ${key}`);
    assert.equal(result.ok, true);
    const hex = bytesToHex(result.rawKeyBytes);
    assert.ok(!seen.has(hex));
    seen.add(hex);
  }
});

test('a non-canonical final character cannot produce different bytes than its canonical form', () => {
  // 16 bytes -> 22 base64url chars; the last char carries 4 unused bits. Flipping only those bits
  // must decode to the same 16 bytes (so key lookup by hash stays stable) or be rejected.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const canonical = parseApiKeyAuthorization(`Bearer pk_live_${encoded}`);
  const canonicalHex = bytesToHex(canonical.rawKeyBytes);
  const lastIndex = alphabet.indexOf(encoded.at(-1));
  for (let low = 0; low < 16; low += 1) {
    const alias = encoded.slice(0, 21) + alphabet[(lastIndex & 0b110000) | low];
    const parsed = parseApiKeyAuthorization(`Bearer pk_live_${alias}`);
    if (parsed.ok) {
      assert.equal(bytesToHex(parsed.rawKeyBytes), canonicalHex, alias);
    }
  }
});

test('hmacApiKey matches an independent HMAC-SHA256 implementation', async () => {
  const pepper = randomBytes(32);
  const expected = createHmac('sha256', pepper).update(Buffer.from(bytes)).digest('hex');
  const actual = bytesToHex(await hmacApiKey(bytes, pepper.toString('base64')));
  assert.equal(actual, expected);
  assert.equal(actual.length, 64);
});

test('hmacApiKey is deterministic, key-sensitive and pepper-sensitive', async () => {
  const pepperA = randomBytes(32).toString('base64');
  const pepperB = randomBytes(32).toString('base64');
  const other = Uint8Array.from(bytes);
  other[15] ^= 1;
  const a1 = bytesToHex(await hmacApiKey(bytes, pepperA));
  assert.equal(bytesToHex(await hmacApiKey(bytes, pepperA)), a1);
  assert.notEqual(bytesToHex(await hmacApiKey(other, pepperA)), a1);
  assert.notEqual(bytesToHex(await hmacApiKey(bytes, pepperB)), a1);
});

test('hmacApiKey refuses peppers that are not exactly 32 bytes and invalid base64', async () => {
  for (const size of [0, 1, 16, 31, 33, 64]) {
    await assert.rejects(() => hmacApiKey(bytes, randomBytes(size).toString('base64')), /32 bytes/, `size ${size}`);
  }
  await assert.rejects(() => hmacApiKey(bytes, '***not base64***'));
});

test('hmacApiKey does not mutate its inputs and handles views into larger buffers', async () => {
  const pepper = randomBytes(32).toString('base64');
  const backing = new Uint8Array(64).fill(9);
  backing.set(bytes, 20);
  const view = backing.subarray(20, 36);
  const before = Array.from(backing);
  const fromView = bytesToHex(await hmacApiKey(view, pepper));
  assert.deepEqual(Array.from(backing), before);
  assert.equal(fromView, bytesToHex(await hmacApiKey(bytes, pepper)));
});

test('bytesToHex pads single digits and handles empty input', () => {
  assert.equal(bytesToHex(Uint8Array.from([0, 1, 15, 16, 255])), '00010f10ff');
  assert.equal(bytesToHex(new Uint8Array()), '');
});
