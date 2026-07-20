#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
const DEFAULT_OUTPUT_DIR = 'output/public-storage-media-audits';
const DEFAULT_BUCKETS = ['module-panels', 'racks', 'manufacturer-logos', 'module-collections', 'patches'];
const PAGE_SIZE = 1000;
const IMAGE_EXTENSIONS = new Set(['avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp']);
const DEFAULT_MAX_BYTES_BY_BUCKET = {
  'module-panels': 512 * 1024,
  racks: 1024 * 1024,
  'manufacturer-logos': 512 * 1024,
  'module-collections': 1024 * 1024,
  patches: 1024 * 1024,
};

export async function auditPublicStorageMedia(options = {}) {
  loadLocalEnv(options.envPath);
  const config = resolveConfig(options);
  progress(config, `Fetching storage.objects for ${config.buckets.join(', ')} from ${config.supabaseUrl}...`);
  const objects = options.objects ?? await fetchStorageObjects(config);
  const audit = summarizeStorageObjects(objects, config);
  const written = writeReports(audit, config);
  progress(config, `Audited ${audit.summary.totalObjects} objects / ${formatBytes(audit.summary.totalBytes)}. Wrote reports to ${path.relative(process.cwd(), config.outputDir)}.`);
  return { ...audit, written };
}

export function summarizeStorageObjects(objects, config = {}) {
  const buckets = config.buckets ?? DEFAULT_BUCKETS;
  const maxBytesByBucket = {
    ...DEFAULT_MAX_BYTES_BY_BUCKET,
    ...(config.maxBytesByBucket ?? {}),
  };

  const rows = objects
    .filter(object => buckets.includes(stringOrEmpty(object.bucket_id)))
    .map(object => normalizeStorageObject(object, maxBytesByBucket));
  const byBucket = new Map();
  const warnings = [];

  for (const row of rows) {
    const bucketSummary = byBucket.get(row.bucketId) ?? {
      bucketId: row.bucketId,
      objectCount: 0,
      totalBytes: 0,
      maxBytes: maxBytesByBucket[row.bucketId] ?? null,
      oversizedCount: 0,
      warningCount: 0,
    };
    bucketSummary.objectCount += 1;
    bucketSummary.totalBytes += row.bytes ?? 0;
    if (row.warningCodes.includes('oversized')) {
      bucketSummary.oversizedCount += 1;
    }
    if (row.warningCodes.length > 0) {
      bucketSummary.warningCount += 1;
      warnings.push(row);
    }
    byBucket.set(row.bucketId, bucketSummary);
  }

  const bucketsSummary = [...byBucket.values()]
    .sort((a, b) => b.totalBytes - a.totalBytes)
    .map(summary => ({
      ...summary,
      totalMB: Number((summary.totalBytes / 1024 / 1024).toFixed(2)),
    }));

  return {
    generatedAt: (config.now ?? new Date()).toISOString(),
    summary: {
      buckets: bucketsSummary,
      totalObjects: rows.length,
      totalBytes: rows.reduce((total, row) => total + (row.bytes ?? 0), 0),
      warningCount: warnings.length,
    },
    warnings: warnings.sort(compareWarningRows),
  };
}

export function normalizeStorageObject(object, maxBytesByBucket = DEFAULT_MAX_BYTES_BY_BUCKET) {
  const bucketId = stringOrEmpty(object.bucket_id);
  const name = stringOrEmpty(object.name);
  const metadata = isRecord(object.metadata) ? object.metadata : {};
  const bytes = numberOrNull(metadata.size);
  const mimeType = stringOrEmpty(metadata.mimetype ?? metadata.mimeType ?? metadata.contentType).toLowerCase();
  const extension = readExtension(name);
  const warningCodes = [];

  if (bytes === null) warningCodes.push('missing_size');
  if (bytes === 0) warningCodes.push('zero_size');
  if (bytes !== null && bytes > (maxBytesByBucket[bucketId] ?? Number.POSITIVE_INFINITY)) warningCodes.push('oversized');
  if (extension && !IMAGE_EXTENSIONS.has(extension)) warningCodes.push('non_image_extension');
  if (mimeType && !mimeType.startsWith('image/')) warningCodes.push('non_image_mime');
  if (bucketId === 'patches' && extension && extension !== 'svg') warningCodes.push('unexpected_patch_extension');
  if (/[?#]/.test(name)) warningCodes.push('querylike_filename');

  return {
    bucketId,
    name,
    bytes,
    sizeMB: bytes === null ? null : Number((bytes / 1024 / 1024).toFixed(2)),
    mimeType,
    extension,
    createdAt: stringOrEmpty(object.created_at),
    updatedAt: stringOrEmpty(object.updated_at),
    warningCodes,
  };
}

async function fetchStorageObjects(config) {
  if (!config.supabaseKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY. This audit is read-only, but storage.objects inspection requires an operator key.');
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
  params.set('select', 'bucket_id,name,metadata,created_at,updated_at,last_accessed_at');
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

function resolveConfig(options) {
  const args = parseArgs(options.argv ?? process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const buckets = splitCsv(options.buckets ?? args.buckets ?? DEFAULT_BUCKETS.join(','));
  return {
    supabaseUrl: stripTrailingSlash(options.supabaseUrl ?? args.supabaseUrl ?? process.env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL),
    supabaseKey: options.supabaseKey ?? args.supabaseKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? '',
    buckets,
    maxBytesByBucket: resolveMaxBytesByBucket(args, options.maxBytesByBucket),
    outputDir: path.resolve(options.outputDir ?? args.outputDir ?? DEFAULT_OUTPUT_DIR),
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
    now: options.now ?? new Date(),
    quiet: Boolean(options.quiet ?? args.quiet),
  };
}

function parseArgs(argv) {
  const args = {};
  for (const rawArg of argv) {
    if (rawArg === '--help' || rawArg === '-h') {
      args.help = true;
      continue;
    }
    if (rawArg === '--quiet') {
      args.quiet = true;
      continue;
    }
    const match = rawArg.match(/^--([^=]+)=(.*)$/);
    if (!match) continue;
    args[toCamelCase(match[1])] = match[2];
  }
  return args;
}

function resolveMaxBytesByBucket(args, explicitMaxBytesByBucket) {
  const maxBytesByBucket = { ...DEFAULT_MAX_BYTES_BY_BUCKET, ...(explicitMaxBytesByBucket ?? {}) };
  for (const [key, value] of Object.entries(args)) {
    const match = key.match(/^maxBytes(.+)$/);
    if (!match) continue;
    const bucket = toKebabCase(match[1]);
    const bytes = Number(value);
    if (Number.isInteger(bytes) && bytes > 0) {
      maxBytesByBucket[bucket] = bytes;
    }
  }
  return maxBytesByBucket;
}

function writeReports(audit, config) {
  mkdirSync(config.outputDir, { recursive: true });
  const stamp = config.now.toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(config.outputDir, `${stamp}-summary.json`);
  const csvPath = path.join(config.outputDir, `${stamp}-warnings.csv`);
  writeFileSync(jsonPath, `${JSON.stringify(audit, null, 2)}\n`);
  writeFileSync(csvPath, warningRowsToCsv(audit.warnings));
  return { jsonPath, csvPath };
}

function warningRowsToCsv(rows) {
  const columns = ['bucketId', 'name', 'bytes', 'sizeMB', 'mimeType', 'extension', 'warningCodes'];
  return [
    columns.join(','),
    ...rows.map(row => columns.map(column => csvCell(column === 'warningCodes' ? row.warningCodes.join('|') : row[column])).join(',')),
  ].join('\n') + '\n';
}

function compareWarningRows(a, b) {
  return a.bucketId.localeCompare(b.bucketId)
    || (b.bytes ?? 0) - (a.bytes ?? 0)
    || a.name.localeCompare(b.name);
}

function readExtension(name) {
  const baseName = path.posix.basename(name).toLowerCase();
  const index = baseName.lastIndexOf('.');
  return index > -1 ? baseName.slice(index + 1) : '';
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

function loadLocalEnv(envPath) {
  const candidates = envPath ? [envPath] : ['.env', '.env.local'];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const content = readFileSync(candidate, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const match = rawLine.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match || process.env[match[1]]) continue;
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

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function toKebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function stringOrEmpty(value) {
  return typeof value === 'string' ? value : '';
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/+$/, '');
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function progress(config, message) {
  if (!config.quiet) console.log(message);
}

function printHelp() {
  console.log(`Usage: node scripts/audits/audit-public-storage-media.mjs [options]

Read-only audit of public media buckets. Writes JSON/CSV reports; never deletes objects.

Options:
  --buckets=module-panels,racks       Buckets to inspect
  --output-dir=output/path            Report directory
  --supabase-url=https://...          Defaults to Patcher project
  --supabase-key=...                  Service-role/operator key
  --max-bytes-module-panels=524288    Override oversized threshold for a bucket
  --max-bytes-racks=1048576           Override oversized threshold for rack previews
  --quiet                            Suppress progress logs
`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  auditPublicStorageMedia().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
