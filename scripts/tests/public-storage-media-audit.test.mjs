import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  auditPublicStorageMedia,
  normalizeStorageObject,
  summarizeStorageObjects,
} from '../audits/audit-public-storage-media.mjs';

test('normalizes storage objects and flags oversized public media', () => {
  const row = normalizeStorageObject({
    bucket_id: 'module-panels',
    name: 'panel.webp',
    metadata: {
      size: 600000,
      mimetype: 'image/webp',
    },
    created_at: '2026-07-07T00:00:00Z',
    updated_at: '2026-07-07T00:00:00Z',
  });

  assert.equal(row.bucketId, 'module-panels');
  assert.equal(row.extension, 'webp');
  assert.deepEqual(row.warningCodes, ['oversized']);
});

test('flags non-image files, missing sizes, query-like names, and unexpected patch extensions', () => {
  const warningRows = [
    normalizeStorageObject({ bucket_id: 'racks', name: 'note.txt', metadata: { size: 10, mimetype: 'text/plain' } }),
    normalizeStorageObject({ bucket_id: 'module-panels', name: 'panel.jpg?old=true', metadata: {} }),
    normalizeStorageObject({ bucket_id: 'patches', name: 'preview.png', metadata: { size: 20, mimetype: 'image/png' } }),
  ];

  assert.deepEqual(warningRows[0].warningCodes, ['non_image_extension', 'non_image_mime']);
  assert.deepEqual(warningRows[1].warningCodes, ['missing_size', 'non_image_extension', 'querylike_filename']);
  assert.deepEqual(warningRows[2].warningCodes, ['unexpected_patch_extension']);
});

test('summarizes storage usage by bucket without mutating input', () => {
  const sourceRows = [
    { bucket_id: 'module-panels', name: 'a.webp', metadata: { size: 100, mimetype: 'image/webp' } },
    { bucket_id: 'racks', name: 'rack.jpeg', metadata: { size: 200, mimetype: 'image/jpeg' } },
    { bucket_id: 'ignored', name: 'ignored.jpeg', metadata: { size: 300, mimetype: 'image/jpeg' } },
  ];

  const audit = summarizeStorageObjects(sourceRows, {
    buckets: ['module-panels', 'racks'],
    now: new Date('2026-07-07T00:00:00.000Z'),
  });

  assert.equal(audit.summary.totalObjects, 2);
  assert.equal(audit.summary.totalBytes, 300);
  assert.deepEqual(audit.summary.buckets.map(bucket => bucket.bucketId), ['racks', 'module-panels']);
  assert.equal(sourceRows.length, 3);
});

test('fetches storage objects with storage schema headers and writes no-delete reports', async () => {
  const fetchedUrls = [];
  const result = await auditPublicStorageMedia({
    quiet: true,
    outputDir: 'tmp/public-storage-media-audit-test',
    supabaseUrl: 'https://supabase.test',
    supabaseKey: 'service-key',
    now: new Date('2026-07-07T00:00:00.000Z'),
    fetchImpl: async (url, init) => {
      fetchedUrls.push({ url: String(url), init });
      return jsonResponse([
        { bucket_id: 'module-panels', name: 'a.webp', metadata: { size: 100, mimetype: 'image/webp' } },
      ]);
    },
  });

  assert.equal(result.summary.totalObjects, 1);
  assert.equal(fetchedUrls.length, 1);
  assert.match(fetchedUrls[0].url, /\/rest\/v1\/objects\?/);
  assert.equal(fetchedUrls[0].init.headers['accept-profile'], 'storage');
  assert.equal(fetchedUrls[0].init.headers.authorization, 'Bearer service-key');
  assert.match(result.written.jsonPath, /summary\.json$/);
  assert.match(result.written.csvPath, /warnings\.csv$/);
});

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    },
  };
}
