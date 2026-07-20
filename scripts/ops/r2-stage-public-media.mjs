#!/usr/bin/env node
import { createHash, createHmac } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
const DEFAULT_BUCKETS = ['module-panels', 'racks'];
const DEFAULT_OUTPUT_DIR = 'output/r2-public-media-staging';
const PAGE_SIZE = 1000;
const DEFAULT_CONCURRENCY = 1;
const EMPTY_SHA256 = createHash('sha256').update('').digest('hex');

export async function stagePublicMediaToR2(options = {}) {
  loadLocalEnv(options.envPath);
  const config = resolveConfig(options);
  if (!config.dryRun) {
    assertExecutableConfig(config);
  }
  const objects = options.objects ?? await fetchStorageObjects(config);
  const inventory = summarizeInventory(objects, config);
  const checkpoint = readCheckpoint(config.checkpointFile);

  progress(config, inventory.summaryText);
  if (config.dryRun) {
    writeSummaryReport({
      config,
      inventory,
      result: {
        dryRun: true,
        plannedCreateBuckets: config.createBuckets ? config.bucketPairs.length : 0,
        plannedCopies: config.copy ? inventory.totalObjects : 0,
        plannedBytes: config.copy ? inventory.totalBytes : 0,
        plannedVerificationObjects: config.verify ? inventory.totalObjects : 0,
      },
    });
    progress(config, `Dry run only. No R2 buckets or objects were changed. Output: ${path.relative(process.cwd(), config.outputDir)}`);
    return { config: publicConfig(config), inventory, dryRun: true };
  }

  mkdirSync(config.outputDir, { recursive: true });

  const result = {
    createdBuckets: [],
    existingBuckets: [],
    copied: 0,
    skippedEquivalent: 0,
    verified: 0,
    failed: 0,
    bytesCopied: 0,
    verificationFailures: [],
  };

  if (config.createBuckets) {
    for (const pair of config.bucketPairs) {
      const bucketResult = await ensureR2Bucket(pair.destinationBucket, config);
      result[bucketResult.created ? 'createdBuckets' : 'existingBuckets'].push(pair.destinationBucket);
    }
  }

  if (config.copy) {
    await mapLimit(inventory.objects, config.concurrency, async (object) => {
      const priorRecord = checkpoint.get(object.keyHash);
      if (isReusableCopyCheckpoint(priorRecord, object)) {
        result.skippedEquivalent += 1;
        return;
      }
      try {
        const copyResult = await copyObjectToR2(object, config, priorRecord?.status ?? '');
        appendCheckpoint(config.checkpointFile, copyResult.checkpoint);
        if (copyResult.status === 'copied') {
          result.copied += 1;
          result.bytesCopied += object.bytes;
        } else if (copyResult.status === 'skipped_equivalent') {
          result.skippedEquivalent += 1;
        }
      } catch (error) {
        result.failed += 1;
        appendCheckpoint(config.checkpointFile, {
          keyHash: object.keyHash,
          sourceBucket: object.bucketId,
          destinationBucket: object.destinationBucket,
          status: 'failed',
          bytes: object.bytes,
          error: error instanceof Error ? error.message : String(error),
          updatedAt: new Date().toISOString(),
        });
        throw new Error(`Copy failed for ${object.bucketId} object ${object.keyHash}: ${error instanceof Error ? error.message : error}`);
      }
    });
  }

  if (config.verify) {
    const verification = await verifyR2Parity(inventory, config);
    result.verified = verification.verified;
    result.verificationFailures = verification.failures;
    result.failed += verification.failures.length;
    if (verification.failures.length > 0) {
      throw new Error(`R2 verification failed for ${verification.failures.length} object(s). See hashed identifiers in ${path.relative(process.cwd(), config.outputDir)}.`);
    }
  }

  writeSummaryReport({ config, inventory, result });
  progress(config, [
    `R2 staging complete.`,
    `created=${result.createdBuckets.length}`,
    `existingBuckets=${result.existingBuckets.length}`,
    `copied=${result.copied}`,
    `skippedEquivalent=${result.skippedEquivalent}`,
    `verified=${result.verified}`,
    `failed=${result.failed}`,
    `bytesCopied=${result.bytesCopied}`,
  ].join(' '));
  return { config: publicConfig(config), inventory, result };
}

export function summarizeInventory(objects, config = {}) {
  const destinationBuckets = config.destinationBuckets ?? {};
  const requestedBuckets = config.buckets ?? DEFAULT_BUCKETS;
  const rows = objects
    .filter(object => requestedBuckets.includes(stringOrEmpty(object.bucket_id)))
    .map(object => normalizeStorageObject(object, destinationBuckets))
    .sort((a, b) => a.bucketId.localeCompare(b.bucketId) || a.name.localeCompare(b.name));

  const sampleSize = Number(config.sampleSize ?? 0);
  const sampledRows = sampleSize > 0
    ? requestedBuckets.flatMap(bucket => rows.filter(row => row.bucketId === bucket).slice(0, sampleSize))
    : rows;

  const byBucket = new Map();
  for (const row of sampledRows) {
    const summary = byBucket.get(row.bucketId) ?? {
      bucketId: row.bucketId,
      destinationBucket: row.destinationBucket,
      objectCount: 0,
      totalBytes: 0,
      maxBytes: 0,
      contentTypes: new Map(),
    };
    summary.objectCount += 1;
    summary.totalBytes += row.bytes;
    summary.maxBytes = Math.max(summary.maxBytes, row.bytes);
    summary.contentTypes.set(row.mimeType || 'unknown', (summary.contentTypes.get(row.mimeType || 'unknown') ?? 0) + 1);
    byBucket.set(row.bucketId, summary);
  }

  const buckets = [...byBucket.values()].map(summary => ({
    ...summary,
    totalMB: Number((summary.totalBytes / 1024 / 1024).toFixed(2)),
    contentTypes: Object.fromEntries([...summary.contentTypes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  }));
  const totalObjects = sampledRows.length;
  const totalBytes = sampledRows.reduce((total, row) => total + row.bytes, 0);

  return {
    generatedAt: (config.now ?? new Date()).toISOString(),
    buckets,
    objects: sampledRows,
    totalObjects,
    totalBytes,
    totalMB: Number((totalBytes / 1024 / 1024).toFixed(2)),
    sourceObjectCountBeforeSampling: rows.length,
    summaryText: `Inventory: ${totalObjects} object(s) / ${formatBytes(totalBytes)} across ${buckets.length} bucket(s).`,
  };
}

export function normalizeStorageObject(object, destinationBuckets = {}) {
  const bucketId = stringOrEmpty(object.bucket_id);
  const name = stringOrEmpty(object.name);
  const metadata = isRecord(object.metadata) ? object.metadata : {};
  const bytes = numberOrNull(metadata.size);
  if (!bucketId || !name) throw new Error('Storage object is missing bucket_id or name.');
  if (bytes === null || bytes < 0) throw new Error(`Storage object ${hashText(`${bucketId}/${name}`)} is missing a valid byte size.`);

  const mimeType = stringOrEmpty(metadata.mimetype ?? metadata.mimeType ?? metadata.contentType).toLowerCase();
  return {
    bucketId,
    destinationBucket: destinationBuckets[bucketId] ?? '',
    name,
    keyHash: hashText(`${bucketId}/${name}`),
    bytes,
    mimeType,
    sourceEtag: stringOrEmpty(metadata.eTag ?? metadata.etag ?? metadata.httpEtag),
    updatedAt: stringOrEmpty(object.updated_at),
  };
}

async function fetchStorageObjects(config) {
  if (!config.supabaseKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY. Storage inventory requires an operator key.');
  }
  if (typeof config.fetchImpl !== 'function') {
    throw new Error('This script requires a runtime with fetch support.');
  }

  const objects = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await fetchStorageObjectPage(offset, config);
    objects.push(...page);
    progress(config, `Fetched storage.objects page ${Math.floor(offset / PAGE_SIZE) + 1}: +${page.length} rows (${objects.length} total)`);
    if (page.length < PAGE_SIZE) return objects;
  }
}

async function fetchStorageObjectPage(offset, config) {
  const params = new URLSearchParams();
  params.set('select', 'bucket_id,name,metadata,updated_at');
  params.set('bucket_id', `in.(${config.buckets.map(encodePostgrestListValue).join(',')})`);
  params.set('order', 'bucket_id.asc,name.asc');
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String(offset));

  const response = await config.fetchImpl(`${config.supabaseUrl}/rest/v1/objects?${params.toString()}`, {
    headers: {
      apikey: config.supabaseKey,
      authorization: `Bearer ${config.supabaseKey}`,
      'accept-profile': 'storage',
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase storage.objects query failed (${response.status}): ${await response.text()}`);
  }
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

async function ensureR2Bucket(bucketName, config) {
  const response = await config.fetchImpl(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.cloudflareAccountId)}/r2/buckets/${encodeURIComponent(bucketName)}`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${config.cloudflareApiToken}`,
      },
    }
  );
  if (response.ok) return { bucketName, created: response.status === 201 };
  if (response.status === 409) return { bucketName, created: false };
  throw new Error(`Cloudflare R2 bucket create failed for ${bucketName} (${response.status}): ${await response.text()}`);
}

async function copyObjectToR2(object, config, priorStatus = '') {
  const sourceResponse = await config.fetchImpl(buildSupabasePublicObjectUrl(object, config));
  if (!sourceResponse.ok) {
    throw new Error(`Supabase public object fetch failed (${sourceResponse.status})`);
  }
  const body = Buffer.from(await sourceResponse.arrayBuffer());
  if (body.length !== object.bytes) {
    throw new Error(`Source byte mismatch: inventory=${object.bytes} fetched=${body.length}`);
  }
  const sourceSha256 = sha256Hex(body);
  const sourceContentType = readResponseHeader(sourceResponse, 'content-type') || object.mimeType || 'application/octet-stream';
  const existing = await headR2Object(object, config);

  if (existing.exists) {
    if (existing.bytes === object.bytes && normalizeContentType(existing.contentType) === normalizeContentType(sourceContentType)) {
      if (await r2ObjectBodyMatches(object, sourceSha256, config)) {
        return {
          status: 'skipped_equivalent',
          checkpoint: checkpointRecord(object, 'skipped_equivalent', sourceSha256, priorStatus),
        };
      }
    }
    throw new Error('Destination object exists but is not byte-equivalent; refusing to overwrite.');
  }

  const putResponse = await r2Fetch(config, {
    method: 'PUT',
    bucketName: object.destinationBucket,
    key: object.name,
    headers: {
      'content-type': sourceContentType,
      'x-amz-meta-patcher-source-bucket': object.bucketId,
      'x-amz-meta-patcher-source-sha256': sourceSha256,
      'x-amz-meta-patcher-source-size': String(object.bytes),
    },
    body,
  });
  if (!putResponse.ok) {
    throw new Error(`R2 PUT failed (${putResponse.status}): ${await putResponse.text()}`);
  }

  const afterPut = await headR2Object(object, config);
  if (!afterPut.exists || afterPut.bytes !== object.bytes) {
    throw new Error('R2 post-copy HEAD verification failed.');
  }
  return {
    status: 'copied',
    checkpoint: checkpointRecord(object, 'copied', sourceSha256, priorStatus),
  };
}

async function verifyR2Parity(inventory, config) {
  const listedByBucket = new Map();
  for (const pair of config.bucketPairs) {
    listedByBucket.set(pair.destinationBucket, await listR2Objects(pair.destinationBucket, config));
  }

  const failures = [];
  let verified = 0;
  for (const object of inventory.objects) {
    const listed = listedByBucket.get(object.destinationBucket)?.get(object.name);
    if (!listed) {
      failures.push({ keyHash: object.keyHash, bucketId: object.bucketId, reason: 'missing_destination_key' });
      continue;
    }
    if (listed.bytes !== object.bytes) {
      failures.push({ keyHash: object.keyHash, bucketId: object.bucketId, reason: 'byte_mismatch' });
      continue;
    }
    const head = await headR2Object(object, config);
    if (!head.exists) {
      failures.push({ keyHash: object.keyHash, bucketId: object.bucketId, reason: 'missing_destination_head' });
      continue;
    }
    if (head.bytes !== object.bytes) {
      failures.push({ keyHash: object.keyHash, bucketId: object.bucketId, reason: 'head_byte_mismatch' });
      continue;
    }
    if (object.mimeType && normalizeContentType(head.contentType) !== normalizeContentType(object.mimeType)) {
      failures.push({ keyHash: object.keyHash, bucketId: object.bucketId, reason: 'content_type_mismatch' });
      continue;
    }
    const hashCheck = await verifyObjectHash(object, head, config);
    if (!hashCheck.ok) {
      failures.push({ keyHash: object.keyHash, bucketId: object.bucketId, reason: hashCheck.reason });
      continue;
    }
    verified += 1;
  }

  for (const [destinationBucket, listedObjects] of listedByBucket.entries()) {
    const expectedNames = new Set(inventory.objects
      .filter(object => object.destinationBucket === destinationBucket)
      .map(object => object.name));
    for (const [name] of listedObjects.entries()) {
      if (!expectedNames.has(name)) {
        failures.push({
          keyHash: hashText(`${destinationBucket}/${name}`),
          bucketId: readSourceBucketForDestination(destinationBucket, config),
          reason: 'unexpected_destination_key',
        });
      }
    }
  }

  writeFileSync(path.join(config.outputDir, 'verification-failures.json'), `${JSON.stringify(failures, null, 2)}\n`);
  return { verified, failures };
}

async function headR2Object(object, config) {
  const response = await r2Fetch(config, {
    method: 'HEAD',
    bucketName: object.destinationBucket,
    key: object.name,
  });
  if (response.status === 404) return { exists: false };
  if (!response.ok) {
    throw new Error(`R2 HEAD failed (${response.status}): ${await response.text()}`);
  }
  const bytes = numberOrNull(readResponseHeader(response, 'content-length'));
  if (bytes === null) {
    throw new Error('R2 HEAD response is missing a valid content-length.');
  }
  return {
    exists: true,
    bytes,
    contentType: readResponseHeader(response, 'content-type'),
    etag: trimQuotes(readResponseHeader(response, 'etag')),
    metadata: readR2Metadata(response),
  };
}

async function r2ObjectBodyMatches(object, sourceSha256, config) {
  const response = await r2Fetch(config, {
    method: 'GET',
    bucketName: object.destinationBucket,
    key: object.name,
  });
  if (!response.ok) return false;
  const body = Buffer.from(await response.arrayBuffer());
  return sha256Hex(body) === sourceSha256;
}

async function verifyObjectHash(object, head, config) {
  const sourceResponse = await config.fetchImpl(buildSupabasePublicObjectUrl(object, config));
  if (!sourceResponse.ok) return { ok: false, reason: 'source_hash_fetch_failed' };
  const sourceBody = Buffer.from(await sourceResponse.arrayBuffer());
  if (sourceBody.length !== object.bytes) return { ok: false, reason: 'source_hash_byte_mismatch' };
  const sourceSha256 = sha256Hex(sourceBody);
  if (head.metadata['patcher-source-sha256']) {
    if (head.metadata['patcher-source-sha256'] !== sourceSha256) {
      return { ok: false, reason: 'source_sha256_metadata_mismatch' };
    }
  }
  const destinationResponse = await r2Fetch(config, {
    method: 'GET',
    bucketName: object.destinationBucket,
    key: object.name,
  });
  if (!destinationResponse.ok) return { ok: false, reason: 'destination_hash_fetch_failed' };
  const destinationBody = Buffer.from(await destinationResponse.arrayBuffer());
  return sha256Hex(destinationBody) === sourceSha256
    ? { ok: true }
    : { ok: false, reason: 'destination_sha256_mismatch' };
}

async function listR2Objects(bucketName, config) {
  const objects = new Map();
  let continuationToken = '';
  for (;;) {
    const query = new URLSearchParams({ 'list-type': '2' });
    if (continuationToken) query.set('continuation-token', continuationToken);
    const response = await r2Fetch(config, {
      method: 'GET',
      bucketName,
      query,
    });
    if (!response.ok) {
      throw new Error(`R2 list failed for ${bucketName} (${response.status}): ${await response.text()}`);
    }
    const xml = await response.text();
    const page = parseS3ListObjectsXml(xml);
    for (const object of page.objects) objects.set(object.key, object);
    if (!page.isTruncated) return objects;
    continuationToken = page.nextContinuationToken;
    if (!continuationToken) throw new Error(`R2 list for ${bucketName} was truncated without a continuation token.`);
  }
}

export function parseS3ListObjectsXml(xml) {
  const objects = [];
  for (const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const content = match[1];
    const key = decodeXml(readXmlTag(content, 'Key'));
    const bytes = Number(readXmlTag(content, 'Size'));
    objects.push({ key, bytes: Number.isFinite(bytes) ? bytes : 0, etag: trimQuotes(decodeXml(readXmlTag(content, 'ETag'))) });
  }
  return {
    objects,
    isTruncated: readXmlTag(xml, 'IsTruncated') === 'true',
    nextContinuationToken: decodeXml(readXmlTag(xml, 'NextContinuationToken')),
  };
}

async function r2Fetch(config, request) {
  const signed = signR2Request({
    accountId: config.cloudflareAccountId,
    accessKeyId: config.r2AccessKeyId,
    secretAccessKey: config.r2SecretAccessKey,
    method: request.method,
    bucketName: request.bucketName,
    key: request.key ?? '',
    query: request.query ?? new URLSearchParams(),
    headers: request.headers ?? {},
    body: request.body ?? Buffer.alloc(0),
    now: config.signingNow ?? new Date(),
  });
  return config.fetchImpl(signed.url, {
    method: request.method,
    headers: signed.headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
  });
}

export function signR2Request({ accountId, accessKeyId, secretAccessKey, method, bucketName, key = '', query = new URLSearchParams(), headers = {}, body = Buffer.alloc(0), now = new Date() }) {
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const encodedKey = encodeS3Key(key);
  const canonicalUri = `/${encodeURIComponent(bucketName)}${encodedKey ? `/${encodedKey}` : ''}`;
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com${canonicalUri}`);
  const canonicalQuery = canonicalQueryString(query);
  url.search = canonicalQuery;

  const bodyHash = method === 'GET' || method === 'HEAD' ? EMPTY_SHA256 : sha256Hex(body);
  const normalizedHeaders = {
    ...lowerCaseHeaders(headers),
    host: url.host,
    'x-amz-content-sha256': bodyHash,
    'x-amz-date': amzDate,
  };
  const sortedHeaderNames = Object.keys(normalizedHeaders).sort();
  const canonicalHeaders = sortedHeaderNames
    .map(name => `${name}:${String(normalizedHeaders[name]).trim().replace(/\s+/g, ' ')}\n`)
    .join('');
  const signedHeaders = sortedHeaderNames.join(';');
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), 'auto'), 's3'), 'aws4_request');
  const signature = hmac(signingKey, stringToSign, 'hex');

  return {
    url: url.toString(),
    headers: {
      ...normalizedHeaders,
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

function resolveConfig(options) {
  const args = parseArgs(options.argv ?? process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const buckets = splitCsv(options.buckets ?? args.buckets ?? DEFAULT_BUCKETS.join(','));
  const destinationBuckets = {
    ...readDestinationBucketsFromEnv(process.env, buckets),
    ...parseDestinationBuckets(args.destination ?? ''),
    ...(options.destinationBuckets ?? {}),
  };
  const bucketPairs = buckets.map(bucket => ({
    sourceBucket: bucket,
    destinationBucket: destinationBuckets[bucket] ?? '',
  }));
  const now = options.now ?? new Date();
  const outputDir = path.resolve(options.outputDir ?? args.outputDir ?? DEFAULT_OUTPUT_DIR);

  return {
    supabaseUrl: stripTrailingSlash(options.supabaseUrl ?? args.supabaseUrl ?? process.env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL),
    supabaseKey: options.supabaseKey ?? args.supabaseKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? '',
    cloudflareAccountId: options.cloudflareAccountId ?? args.cloudflareAccountId ?? process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
    cloudflareApiToken: options.cloudflareApiToken ?? args.cloudflareApiToken ?? process.env.CLOUDFLARE_API_TOKEN ?? '',
    r2AccessKeyId: options.r2AccessKeyId ?? args.r2AccessKeyId ?? process.env.R2_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID ?? '',
    r2SecretAccessKey: options.r2SecretAccessKey ?? args.r2SecretAccessKey ?? process.env.R2_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? '',
    buckets,
    destinationBuckets,
    bucketPairs,
    createBuckets: Boolean(options.createBuckets ?? args.createBuckets),
    copy: Boolean(options.copy ?? args.copy),
    verify: Boolean(options.verify ?? args.verify),
    dryRun: !Boolean(options.execute ?? args.execute),
    allowSampleExecute: Boolean(options.allowSampleExecute ?? args.allowSampleExecute),
    sampleSize: numberOrNull(options.sampleSize ?? args.sampleSize) ?? 0,
    concurrency: numberOrNull(options.concurrency ?? args.concurrency) ?? DEFAULT_CONCURRENCY,
    outputDir,
    checkpointFile: path.resolve(options.checkpointFile ?? args.checkpointFile ?? path.join(outputDir, 'checkpoint.jsonl')),
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
    now,
    quiet: Boolean(options.quiet ?? args.quiet),
  };
}

function assertExecutableConfig(config) {
  const missing = [];
  if (!config.supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY');
  if (!config.cloudflareAccountId) missing.push('CLOUDFLARE_ACCOUNT_ID');
  if (config.createBuckets && !config.cloudflareApiToken) missing.push('CLOUDFLARE_API_TOKEN');
  if ((config.copy || config.verify) && !config.r2AccessKeyId) missing.push('R2_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID');
  if ((config.copy || config.verify) && !config.r2SecretAccessKey) missing.push('R2_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY');
  if (!Number.isInteger(config.concurrency) || config.concurrency < 1) missing.push('--concurrency=<positive-integer>');
  if (config.copy && config.concurrency !== 1) missing.push('--concurrency=1 for execute copy safety');
  if (config.sampleSize > 0 && !config.allowSampleExecute) {
    missing.push('--allow-sample-execute when using --sample-size with --execute');
  }
  for (const pair of config.bucketPairs) {
    if (!pair.destinationBucket) missing.push(`R2_BUCKET_${toEnvBucketSuffix(pair.sourceBucket)} or --destination=${pair.sourceBucket}:<r2-bucket>`);
  }
  const destinationBuckets = config.bucketPairs.map(pair => pair.destinationBucket).filter(Boolean);
  if (new Set(destinationBuckets).size !== destinationBuckets.length) {
    missing.push('unique R2 destination bucket per source bucket');
  }
  if (missing.length > 0) {
    throw new Error(`Missing required explicit R2 configuration: ${[...new Set(missing)].join(', ')}`);
  }
}

function parseArgs(argv) {
  const args = {};
  for (const rawArg of argv) {
    if (rawArg === '--help' || rawArg === '-h') {
      args.help = true;
      continue;
    }
    if (rawArg === '--execute') {
      args.execute = true;
      continue;
    }
    if (rawArg === '--create-buckets') {
      args.createBuckets = true;
      continue;
    }
    if (rawArg === '--copy') {
      args.copy = true;
      continue;
    }
    if (rawArg === '--verify') {
      args.verify = true;
      continue;
    }
    if (rawArg === '--quiet') {
      args.quiet = true;
      continue;
    }
    if (rawArg === '--allow-sample-execute') {
      args.allowSampleExecute = true;
      continue;
    }
    const match = rawArg.match(/^--([^=]+)=(.*)$/);
    if (!match) continue;
    args[toCamelCase(match[1])] = match[2];
  }
  return args;
}

function writeSummaryReport({ config, inventory, result }) {
  mkdirSync(config.outputDir, { recursive: true });
  const report = {
    generatedAt: (config.now ?? new Date()).toISOString(),
    config: publicConfig(config),
    inventory: {
      totalObjects: inventory.totalObjects,
      totalBytes: inventory.totalBytes,
      totalMB: inventory.totalMB,
      sourceObjectCountBeforeSampling: inventory.sourceObjectCountBeforeSampling,
      buckets: inventory.buckets.map(bucket => ({
        bucketId: bucket.bucketId,
        destinationBucket: bucket.destinationBucket,
        objectCount: bucket.objectCount,
        totalBytes: bucket.totalBytes,
        totalMB: bucket.totalMB,
        maxBytes: bucket.maxBytes,
        contentTypes: bucket.contentTypes,
      })),
    },
    result,
  };
  writeFileSync(path.join(config.outputDir, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);
}

function publicConfig(config) {
  return {
    supabaseUrl: config.supabaseUrl,
    buckets: config.buckets,
    bucketPairs: config.bucketPairs,
    createBuckets: config.createBuckets,
    copy: config.copy,
    verify: config.verify,
    dryRun: config.dryRun,
    allowSampleExecute: config.allowSampleExecute,
    sampleSize: config.sampleSize,
    concurrency: config.concurrency,
    outputDir: config.outputDir,
    checkpointFile: config.checkpointFile,
    hasSupabaseKey: Boolean(config.supabaseKey),
    hasCloudflareAccountId: Boolean(config.cloudflareAccountId),
    hasCloudflareApiToken: Boolean(config.cloudflareApiToken),
    hasR2AccessKeyId: Boolean(config.r2AccessKeyId),
    hasR2SecretAccessKey: Boolean(config.r2SecretAccessKey),
  };
}

function checkpointRecord(object, status, sourceSha256, priorStatus) {
  return {
    keyHash: object.keyHash,
    sourceBucket: object.bucketId,
    destinationBucket: object.destinationBucket,
    status,
    previousStatus: priorStatus || '',
    bytes: object.bytes,
    sourceEtag: object.sourceEtag,
    sourceUpdatedAt: object.updatedAt,
    sourceSha256,
    updatedAt: new Date().toISOString(),
  };
}

function appendCheckpoint(checkpointFile, record) {
  mkdirSync(path.dirname(checkpointFile), { recursive: true });
  appendFileSync(checkpointFile, `${JSON.stringify(record)}\n`);
}

function readCheckpoint(checkpointFile) {
  const checkpoint = new Map();
  if (!existsSync(checkpointFile)) return checkpoint;
  const content = readFileSync(checkpointFile, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    if (record.keyHash && record.status) checkpoint.set(record.keyHash, record);
  }
  return checkpoint;
}

function isReusableCopyCheckpoint(record, object) {
  if (!record || !['copied', 'skipped_equivalent', 'verified'].includes(record.status)) return false;
  return record.bytes === object.bytes
    && stringOrEmpty(record.sourceBucket) === object.bucketId
    && stringOrEmpty(record.destinationBucket) === object.destinationBucket
    && stringOrEmpty(record.sourceEtag) === object.sourceEtag
    && stringOrEmpty(record.sourceUpdatedAt) === object.updatedAt;
}

async function mapLimit(items, limit, mapper) {
  const safeLimit = Math.max(1, Math.min(limit, items.length || 1));
  const workers = Array.from({ length: safeLimit }, async (_, workerIndex) => {
    for (let index = workerIndex; index < items.length; index += safeLimit) {
      await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
}

function buildSupabasePublicObjectUrl(object, config) {
  return `${config.supabaseUrl}/storage/v1/object/public/${encodeURIComponent(object.bucketId)}/${encodePathSegments(object.name)}`;
}

function readR2Metadata(response) {
  const metadata = {};
  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase().startsWith('x-amz-meta-')) {
      metadata[key.toLowerCase().slice('x-amz-meta-'.length)] = value;
    }
  }
  return metadata;
}

function readResponseHeader(response, headerName) {
  return response.headers?.get?.(headerName) ?? response.headers?.get?.(headerName.toLowerCase()) ?? '';
}

function readSourceBucketForDestination(destinationBucket, config) {
  return config.bucketPairs.find(pair => pair.destinationBucket === destinationBucket)?.sourceBucket ?? '';
}

function canonicalQueryString(query) {
  const entries = [...query.entries()]
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)])
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  return entries.map(([key, value]) => `${key}=${value}`).join('&');
}

function encodeS3Key(key) {
  return String(key)
    .split('/')
    .map(encodeRfc3986)
    .join('/');
}

function encodePathSegments(key) {
  return String(key)
    .split('/')
    .map(encodeURIComponent)
    .join('/');
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function lowerCaseHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hmac(key, value, encoding) {
  return createHmac('sha256', key).update(value).digest(encoding);
}

function hashText(value) {
  return sha256Hex(value).slice(0, 16);
}

function parseDestinationBuckets(value) {
  const destinations = {};
  for (const part of splitCsv(value)) {
    const [sourceBucket, destinationBucket] = part.split(':').map(item => item.trim());
    if (sourceBucket && destinationBucket) destinations[sourceBucket] = destinationBucket;
  }
  return destinations;
}

function readDestinationBucketsFromEnv(env, buckets) {
  const destinations = {};
  for (const bucket of buckets) {
    const value = env[`R2_BUCKET_${toEnvBucketSuffix(bucket)}`];
    if (value) destinations[bucket] = value;
  }
  return destinations;
}

function toEnvBucketSuffix(bucket) {
  return bucket.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function splitCsv(value) {
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

function encodePostgrestListValue(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

export function loadLocalEnv(envPath) {
  const candidates = envPath ? [envPath] : ['.env', '.env.local'];
  const originalEnvKeys = new Set(Object.keys(process.env));
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const content = readFileSync(candidate, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const match = rawLine.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match || originalEnvKeys.has(match[1])) continue;
      process.env[match[1]] = normalizeEnvValue(match[2]);
    }
  }
}

function normalizeEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  if (!trimmed) return '';
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
  return trimmed.replace(/\s+#.*$/, '').trim();
}

function readXmlTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`));
  return match?.[1] ?? '';
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, '\'')
    .replace(/&amp;/g, '&');
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function stringOrEmpty(value) {
  return typeof value === 'string' ? value : '';
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/+$/, '');
}

function normalizeContentType(value) {
  return stringOrEmpty(value).split(';')[0].trim().toLowerCase();
}

function trimQuotes(value) {
  return stringOrEmpty(value).replace(/^"|"$/g, '');
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function progress(config, message) {
  if (!config.quiet) console.log(message);
}

function printHelp() {
  console.log(`Usage: node scripts/ops/r2-stage-public-media.mjs [options]

Default-safe staging tool for copying public Supabase media buckets to Cloudflare R2.
Default mode is dry-run. Add --execute for writes.

Required for inventory:
  SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY

Required for --execute --create-buckets:
  CLOUDFLARE_ACCOUNT_ID
  CLOUDFLARE_API_TOKEN

Required for --execute --copy or --verify:
  CLOUDFLARE_ACCOUNT_ID
  R2_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY
  R2_BUCKET_MODULE_PANELS and R2_BUCKET_RACKS, or --destination=module-panels:<bucket>,racks:<bucket>

Options:
  --buckets=module-panels,racks
  --destination=module-panels:<r2-bucket>,racks:<r2-bucket>
  --create-buckets
  --copy
  --verify
  --execute
  --sample-size=5
  --allow-sample-execute            Required with --execute --sample-size to avoid accidental partial full runs
  --concurrency=1                    Copy writes are intentionally serialized for fail-fast safety
  --output-dir=output/r2-public-media-staging
  --checkpoint-file=output/r2-public-media-staging/checkpoint.jsonl
  --quiet
`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  stagePublicMediaToR2().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
