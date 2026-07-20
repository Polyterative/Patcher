import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import {
  loadLocalEnv,
  parseS3ListObjectsXml,
  signR2Request,
  stagePublicMediaToR2,
  summarizeInventory,
} from '../ops/r2-stage-public-media.mjs';

const objects = [
  {
    bucket_id: 'module-panels',
    name: 'panel.webp',
    metadata: { size: 12, mimetype: 'image/webp' },
    updated_at: '2026-07-17T00:00:00Z',
  },
  {
    bucket_id: 'racks',
    name: 'nested/rack.jpeg',
    metadata: { size: 20, mimetype: 'image/jpeg' },
    updated_at: '2026-07-17T00:00:00Z',
  },
];

test('summarizes source inventory without exposing keys in aggregate buckets', () => {
  const inventory = summarizeInventory(objects, {
    buckets: ['module-panels', 'racks'],
    destinationBuckets: {
      'module-panels': 'patcher-module-panels',
      racks: 'patcher-racks',
    },
    now: new Date('2026-07-17T00:00:00.000Z'),
  });

  assert.equal(inventory.totalObjects, 2);
  assert.equal(inventory.totalBytes, 32);
  assert.deepEqual(inventory.buckets.map(bucket => bucket.destinationBucket), ['patcher-module-panels', 'patcher-racks']);
  assert.ok(inventory.objects.every(object => object.keyHash && !object.keyHash.includes(object.name)));
});

test('rejects inventory rows with missing object size', () => {
  assert.throws(
    () => summarizeInventory([
      { bucket_id: 'module-panels', name: 'missing.webp', metadata: { mimetype: 'image/webp' } },
    ], { buckets: ['module-panels'] }),
    /missing a valid byte size/
  );
});

test('defaults to dry-run and writes no R2 requests', async () => {
  const fetchedUrls = [];
  const result = await stagePublicMediaToR2({
    quiet: true,
    outputDir: 'tmp/r2-public-media-staging-test-dry-run',
    supabaseKey: 'service-key',
    cloudflareAccountId: 'account-id',
    destinationBuckets: {
      'module-panels': 'patcher-module-panels',
      racks: 'patcher-racks',
    },
    createBuckets: true,
    copy: true,
    verify: true,
    now: new Date('2026-07-17T00:00:00.000Z'),
    fetchImpl: async (url, init) => {
      fetchedUrls.push({ url: String(url), init });
      return jsonResponse(objects);
    },
  });

  assert.equal(result.dryRun, true);
  assert.equal(fetchedUrls.length, 1);
  assert.match(fetchedUrls[0].url, /\/rest\/v1\/objects\?/);
  assert.equal(fetchedUrls[0].init.headers.authorization, 'Bearer service-key');
});

test('requires explicit destination buckets before execute mode', async () => {
  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      objects,
      execute: true,
      copy: true,
      cloudflareAccountId: 'account-id',
      r2AccessKeyId: 'access',
      r2SecretAccessKey: 'secret',
      outputDir: 'tmp/r2-public-media-staging-test-missing-dest',
      now: new Date('2026-07-17T00:00:00.000Z'),
      fetchImpl: async () => jsonResponse([]),
    }),
    /R2_BUCKET_MODULE_PANELS/
  );
});

test('reports all required execute config before fetching inventory', async () => {
  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      execute: true,
      createBuckets: true,
      copy: true,
      verify: true,
      outputDir: 'tmp/r2-public-media-staging-test-execute-preflight',
      fetchImpl: async () => {
        throw new Error('execute preflight should fail before fetch');
      },
    }),
    error => {
      assert.match(error.message, /SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY/);
      assert.match(error.message, /CLOUDFLARE_ACCOUNT_ID/);
      assert.match(error.message, /CLOUDFLARE_API_TOKEN/);
      assert.match(error.message, /R2_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID/);
      assert.match(error.message, /R2_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY/);
      assert.match(error.message, /R2_BUCKET_MODULE_PANELS/);
      assert.match(error.message, /R2_BUCKET_RACKS/);
      return true;
    }
  );
});

test('requires an explicit opt-in before executing a sampled copy', async () => {
  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      buckets: ['module-panels'],
      objects: [objects[0]],
      execute: true,
      copy: true,
      sampleSize: 1,
      supabaseKey: 'service-key',
      cloudflareAccountId: 'account-id',
      r2AccessKeyId: 'access',
      r2SecretAccessKey: 'secret',
      destinationBuckets: {
        'module-panels': 'patcher-module-panels',
      },
      outputDir: 'tmp/r2-public-media-staging-test-sample-guard',
      now: new Date('2026-07-17T00:00:00.000Z'),
      fetchImpl: async () => jsonResponse([]),
    }),
    /--allow-sample-execute/
  );
});

test('requires positive concurrency before execute mode', async () => {
  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      buckets: ['module-panels'],
      objects: [objects[0]],
      execute: true,
      copy: true,
      concurrency: 0,
      supabaseKey: 'service-key',
      cloudflareAccountId: 'account-id',
      r2AccessKeyId: 'access',
      r2SecretAccessKey: 'secret',
      destinationBuckets: {
        'module-panels': 'patcher-module-panels',
      },
      outputDir: 'tmp/r2-public-media-staging-test-concurrency-guard',
      now: new Date('2026-07-17T00:00:00.000Z'),
      fetchImpl: async () => jsonResponse([]),
    }),
    /--concurrency=<positive-integer>/
  );
});

test('rejects parallel execute copy to preserve fail-fast safety', async () => {
  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      buckets: ['module-panels'],
      objects: [objects[0]],
      execute: true,
      copy: true,
      concurrency: 2,
      supabaseKey: 'service-key',
      cloudflareAccountId: 'account-id',
      r2AccessKeyId: 'access',
      r2SecretAccessKey: 'secret',
      destinationBuckets: {
        'module-panels': 'patcher-module-panels',
      },
      outputDir: 'tmp/r2-public-media-staging-test-parallel-copy-guard',
      now: new Date('2026-07-17T00:00:00.000Z'),
      fetchImpl: async () => jsonResponse([]),
    }),
    /--concurrency=1/
  );
});

test('rejects duplicate destination buckets before execute mode', async () => {
  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      objects,
      execute: true,
      copy: true,
      supabaseKey: 'service-key',
      cloudflareAccountId: 'account-id',
      r2AccessKeyId: 'access',
      r2SecretAccessKey: 'secret',
      destinationBuckets: {
        'module-panels': 'patcher-media',
        racks: 'patcher-media',
      },
      outputDir: 'tmp/r2-public-media-staging-test-duplicate-dest',
      now: new Date('2026-07-17T00:00:00.000Z'),
      fetchImpl: async () => jsonResponse([]),
    }),
    /unique R2 destination bucket/
  );
});

test('skips checkpointed copy objects on resume', async () => {
  const inventory = summarizeInventory([objects[0]], {
    buckets: ['module-panels'],
    destinationBuckets: {
      'module-panels': 'patcher-module-panels',
    },
  });
  const checkpointFile = 'tmp/r2-public-media-staging-test-resume/checkpoint.jsonl';
  mkdirSync('tmp/r2-public-media-staging-test-resume', { recursive: true });
  writeFileSync(checkpointFile, `${JSON.stringify({
    keyHash: inventory.objects[0].keyHash,
    status: 'copied',
    sourceBucket: inventory.objects[0].bucketId,
    destinationBucket: inventory.objects[0].destinationBucket,
    bytes: inventory.objects[0].bytes,
    sourceEtag: inventory.objects[0].sourceEtag,
    sourceUpdatedAt: inventory.objects[0].updatedAt,
  })}\n`);

  const result = await stagePublicMediaToR2({
    quiet: true,
    buckets: ['module-panels'],
    objects: [objects[0]],
    execute: true,
    copy: true,
    supabaseKey: 'service-key',
    cloudflareAccountId: 'account-id',
    r2AccessKeyId: 'access',
    r2SecretAccessKey: 'secret',
    destinationBuckets: {
      'module-panels': 'patcher-module-panels',
    },
    checkpointFile,
    outputDir: 'tmp/r2-public-media-staging-test-resume',
    now: new Date('2026-07-17T00:00:00.000Z'),
    fetchImpl: async () => {
      throw new Error('checkpointed object should not be fetched');
    },
  });

  assert.equal(result.result.copied, 0);
  assert.equal(result.result.skippedEquivalent, 1);
});

test('does not reuse a checkpoint when the source snapshot changed', async () => {
  const inventory = summarizeInventory([objects[0]], {
    buckets: ['module-panels'],
    destinationBuckets: {
      'module-panels': 'patcher-module-panels',
    },
  });
  const checkpointFile = 'tmp/r2-public-media-staging-test-stale-checkpoint/checkpoint.jsonl';
  mkdirSync('tmp/r2-public-media-staging-test-stale-checkpoint', { recursive: true });
  writeFileSync(checkpointFile, `${JSON.stringify({
    keyHash: inventory.objects[0].keyHash,
    status: 'copied',
    bytes: 999,
    sourceUpdatedAt: inventory.objects[0].updatedAt,
  })}\n`);

  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      buckets: ['module-panels'],
      objects: [objects[0]],
      execute: true,
      copy: true,
      supabaseKey: 'service-key',
      cloudflareAccountId: 'account-id',
      r2AccessKeyId: 'access',
      r2SecretAccessKey: 'secret',
      destinationBuckets: {
        'module-panels': 'patcher-module-panels',
      },
      checkpointFile,
      outputDir: 'tmp/r2-public-media-staging-test-stale-checkpoint',
      now: new Date('2026-07-17T00:00:00.000Z'),
      fetchImpl: async () => {
        throw new Error('stale checkpoint should not skip source fetch');
      },
    }),
    /stale checkpoint should not skip/
  );
});

test('does not reuse a checkpoint when destination mapping changed', async () => {
  const inventory = summarizeInventory([objects[0]], {
    buckets: ['module-panels'],
    destinationBuckets: {
      'module-panels': 'old-module-panels',
    },
  });
  const checkpointFile = 'tmp/r2-public-media-staging-test-remapped-checkpoint/checkpoint.jsonl';
  mkdirSync('tmp/r2-public-media-staging-test-remapped-checkpoint', { recursive: true });
  writeFileSync(checkpointFile, `${JSON.stringify({
    keyHash: inventory.objects[0].keyHash,
    status: 'copied',
    sourceBucket: inventory.objects[0].bucketId,
    destinationBucket: inventory.objects[0].destinationBucket,
    bytes: inventory.objects[0].bytes,
    sourceEtag: inventory.objects[0].sourceEtag,
    sourceUpdatedAt: inventory.objects[0].updatedAt,
  })}\n`);

  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      buckets: ['module-panels'],
      objects: [objects[0]],
      execute: true,
      copy: true,
      supabaseKey: 'service-key',
      cloudflareAccountId: 'account-id',
      r2AccessKeyId: 'access',
      r2SecretAccessKey: 'secret',
      destinationBuckets: {
        'module-panels': 'new-module-panels',
      },
      checkpointFile,
      outputDir: 'tmp/r2-public-media-staging-test-remapped-checkpoint',
      now: new Date('2026-07-17T00:00:00.000Z'),
      fetchImpl: async () => {
        throw new Error('remapped checkpoint should not skip source fetch');
      },
    }),
    /remapped checkpoint should not skip/
  );
});

test('refuses to overwrite an existing non-equivalent R2 object', async () => {
  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      buckets: ['module-panels'],
      objects: [objects[0]],
      execute: true,
      copy: true,
      supabaseKey: 'service-key',
      cloudflareAccountId: 'account-id',
      r2AccessKeyId: 'access',
      r2SecretAccessKey: 'secret',
      destinationBuckets: {
        'module-panels': 'patcher-module-panels',
      },
      outputDir: 'tmp/r2-public-media-staging-test-existing',
      now: new Date('2026-07-17T00:00:00.000Z'),
      fetchImpl: async (url, init = {}) => {
        const requestUrl = String(url);
        if (requestUrl.includes('/storage/v1/object/public/')) {
          return binaryResponse(Buffer.from('hello world!'), { 'content-type': 'image/webp' });
        }
        if (init.method === 'HEAD') {
          return emptyResponse(200, {
            'content-length': '12',
            'content-type': 'image/png',
          });
        }
        throw new Error(`unexpected request ${init.method ?? 'GET'} ${requestUrl}`);
      },
    }),
    /refusing to overwrite/
  );
});

test('does not trust matching destination hash metadata without body parity', async () => {
  const sourceBody = Buffer.from('hello world!');
  const sourceSha256 = sha256Hex(sourceBody);

  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      buckets: ['module-panels'],
      objects: [objects[0]],
      execute: true,
      copy: true,
      supabaseKey: 'service-key',
      cloudflareAccountId: 'account-id',
      r2AccessKeyId: 'access',
      r2SecretAccessKey: 'secret',
      destinationBuckets: {
        'module-panels': 'patcher-module-panels',
      },
      outputDir: 'tmp/r2-public-media-staging-test-metadata-not-trusted',
      now: new Date('2026-07-17T00:00:00.000Z'),
      fetchImpl: async (url, init = {}) => {
        const requestUrl = String(url);
        if (requestUrl.includes('/storage/v1/object/public/')) {
          return binaryResponse(sourceBody, { 'content-type': 'image/webp' });
        }
        if (init.method === 'HEAD') {
          return emptyResponse(200, {
            'content-length': '12',
            'content-type': 'image/webp',
            'x-amz-meta-patcher-source-sha256': sourceSha256,
          });
        }
        if (init.method === 'GET') {
          return binaryResponse(Buffer.from('HELLO WORLD!'), { 'content-type': 'image/webp' });
        }
        throw new Error(`unexpected request ${init.method ?? 'GET'} ${requestUrl}`);
      },
    }),
    /refusing to overwrite/
  );
});

test('verification fails when destination content type differs', async () => {
  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      buckets: ['module-panels'],
      objects: [objects[0]],
      execute: true,
      verify: true,
      supabaseKey: 'service-key',
      cloudflareAccountId: 'account-id',
      r2AccessKeyId: 'access',
      r2SecretAccessKey: 'secret',
      destinationBuckets: {
        'module-panels': 'patcher-module-panels',
      },
      outputDir: 'tmp/r2-public-media-staging-test-verify-content-type',
      now: new Date('2026-07-17T00:00:00.000Z'),
      fetchImpl: async (url, init = {}) => {
        const requestUrl = String(url);
        if (requestUrl.includes('list-type=2')) {
          return xmlResponse(`<ListBucketResult>
            <IsTruncated>false</IsTruncated>
            <Contents><Key>panel.webp</Key><Size>12</Size><ETag>&quot;etag&quot;</ETag></Contents>
          </ListBucketResult>`);
        }
        if (init.method === 'HEAD') {
          return emptyResponse(200, {
            'content-length': '12',
            'content-type': 'image/png',
          });
        }
        throw new Error(`unexpected request ${init.method ?? 'GET'} ${requestUrl}`);
      },
    }),
    /verification failed/i
  );
});

test('verification fails when destination source hash metadata differs', async () => {
  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      buckets: ['module-panels'],
      objects: [objects[0]],
      execute: true,
      verify: true,
      supabaseKey: 'service-key',
      cloudflareAccountId: 'account-id',
      r2AccessKeyId: 'access',
      r2SecretAccessKey: 'secret',
      destinationBuckets: {
        'module-panels': 'patcher-module-panels',
      },
      outputDir: 'tmp/r2-public-media-staging-test-verify-hash',
      now: new Date('2026-07-17T00:00:00.000Z'),
      fetchImpl: async (url, init = {}) => {
        const requestUrl = String(url);
        if (requestUrl.includes('list-type=2')) {
          return xmlResponse(`<ListBucketResult>
            <IsTruncated>false</IsTruncated>
            <Contents><Key>panel.webp</Key><Size>12</Size><ETag>&quot;etag&quot;</ETag></Contents>
          </ListBucketResult>`);
        }
        if (init.method === 'HEAD') {
          return emptyResponse(200, {
            'content-length': '12',
            'content-type': 'image/webp',
            'x-amz-meta-patcher-source-sha256': 'not-the-source-hash',
          });
        }
        if (requestUrl.includes('/storage/v1/object/public/')) {
          return binaryResponse(Buffer.from('hello world!'), { 'content-type': 'image/webp' });
        }
        throw new Error(`unexpected request ${init.method ?? 'GET'} ${requestUrl}`);
      },
    }),
    /verification failed/i
  );
});

test('verification fails when matching hash metadata has a different destination body', async () => {
  const sourceBody = Buffer.from('hello world!');
  const sourceSha256 = sha256Hex(sourceBody);

  await assert.rejects(
    () => stagePublicMediaToR2({
      quiet: true,
      buckets: ['module-panels'],
      objects: [objects[0]],
      execute: true,
      verify: true,
      supabaseKey: 'service-key',
      cloudflareAccountId: 'account-id',
      r2AccessKeyId: 'access',
      r2SecretAccessKey: 'secret',
      destinationBuckets: {
        'module-panels': 'patcher-module-panels',
      },
      outputDir: 'tmp/r2-public-media-staging-test-verify-body-hash',
      now: new Date('2026-07-17T00:00:00.000Z'),
      fetchImpl: async (url, init = {}) => {
        const requestUrl = String(url);
        if (requestUrl.includes('list-type=2')) {
          return xmlResponse(`<ListBucketResult>
            <IsTruncated>false</IsTruncated>
            <Contents><Key>panel.webp</Key><Size>12</Size><ETag>&quot;etag&quot;</ETag></Contents>
          </ListBucketResult>`);
        }
        if (init.method === 'HEAD') {
          return emptyResponse(200, {
            'content-length': '12',
            'content-type': 'image/webp',
            'x-amz-meta-patcher-source-sha256': sourceSha256,
          });
        }
        if (requestUrl.includes('/storage/v1/object/public/')) {
          return binaryResponse(sourceBody, { 'content-type': 'image/webp' });
        }
        if (init.method === 'GET') {
          return binaryResponse(Buffer.from('HELLO WORLD!'), { 'content-type': 'image/webp' });
        }
        throw new Error(`unexpected request ${init.method ?? 'GET'} ${requestUrl}`);
      },
    }),
    /verification failed/i
  );
});

test('.env.local overrides .env without overriding real process env', () => {
  const previousCwd = process.cwd();
  const tmp = mkdtempSync(`${tmpdir()}/r2-env-test-`);
  const key = 'PATCHER_R2_STAGE_ENV_TEST';
  const protectedKey = 'PATCHER_R2_STAGE_ENV_PROTECTED_TEST';
  const previousValue = process.env[key];
  const previousProtectedValue = process.env[protectedKey];
  try {
    delete process.env[key];
    process.env[protectedKey] = 'process';
    writeFileSync(`${tmp}/.env`, `${key}=base\n${protectedKey}=base\n`);
    writeFileSync(`${tmp}/.env.local`, `${key}=local\n${protectedKey}=local\n`);
    process.chdir(tmp);

    loadLocalEnv();

    assert.equal(process.env[key], 'local');
    assert.equal(process.env[protectedKey], 'process');
  } finally {
    process.chdir(previousCwd);
    if (previousValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previousValue;
    }
    if (previousProtectedValue === undefined) {
      delete process.env[protectedKey];
    } else {
      process.env[protectedKey] = previousProtectedValue;
    }
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('parses S3 list object XML with escaped keys and continuation state', () => {
  const parsed = parseS3ListObjectsXml(`<?xml version="1.0" encoding="UTF-8"?>
    <ListBucketResult>
      <IsTruncated>true</IsTruncated>
      <NextContinuationToken>abc&amp;def</NextContinuationToken>
      <Contents><Key>panel&amp;one.webp</Key><Size>123</Size><ETag>&quot;etag&quot;</ETag></Contents>
    </ListBucketResult>`);

  assert.equal(parsed.isTruncated, true);
  assert.equal(parsed.nextContinuationToken, 'abc&def');
  assert.deepEqual(parsed.objects, [{ key: 'panel&one.webp', bytes: 123, etag: 'etag' }]);
});

test('signs R2 requests with stable AWS v4 headers', () => {
  const signed = signR2Request({
    accountId: 'account-id',
    accessKeyId: 'access-key',
    secretAccessKey: 'secret-key',
    method: 'HEAD',
    bucketName: 'patcher-module-panels',
    key: 'folder/panel 1.webp',
    now: new Date('2026-07-17T00:00:00.000Z'),
  });

  assert.equal(signed.url, 'https://account-id.r2.cloudflarestorage.com/patcher-module-panels/folder/panel%201.webp');
  assert.equal(signed.headers['x-amz-date'], '20260717T000000Z');
  assert.match(signed.headers.authorization, /^AWS4-HMAC-SHA256 Credential=access-key\/20260717\/auto\/s3\/aws4_request/);
  assert.match(signed.headers.authorization, /SignedHeaders=host;x-amz-content-sha256;x-amz-date/);
});

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    },
  };
}

function binaryResponse(payload, headers = {}) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(headers),
    async arrayBuffer() {
      return payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);
    },
    async text() {
      return payload.toString('utf8');
    },
  };
}

function xmlResponse(payload) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/xml' }),
    async text() {
      return payload;
    },
  };
}

function emptyResponse(status, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    async arrayBuffer() {
      return new ArrayBuffer(0);
    },
    async text() {
      return '';
    },
  };
}

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}
