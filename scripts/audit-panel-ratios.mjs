#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
const DEFAULT_OUTPUT_DIR = 'output/panel-ratio-audits';
export const DEFAULT_PANEL_RATIO_THRESHOLD = 0.01;
const DEFAULT_CONCURRENCY = 8;
const DEFAULT_TIMEOUT_MS = 10000;
const PAGE_SIZE = 500;
const MODULE_PANELS_BUCKET = 'module-panels';

const EURORACK_3U_HEIGHT_MM = 128.5;
const EURORACK_3U_HEIGHT_REM = 25.4;
const REM_PER_MM = EURORACK_3U_HEIGHT_REM / EURORACK_3U_HEIGHT_MM;
const INTELLIJEL_1U_HEIGHT_MM = 39.65;
const PULP_LOGIC_1U_HEIGHT_MM = 43.18;

const MODULE_FORMAT_GEOMETRY = {
  EURORACK_3U: { id: 0, name: '3U Eurorack', heightRem: EURORACK_3U_HEIGHT_REM },
  INTELLIJEL_1U: { id: 1, name: 'Intellijel 1U', heightRem: mmToRem(INTELLIJEL_1U_HEIGHT_MM) },
  PULP_LOGIC_1U: { id: 2, name: 'Pulp Logic 1U', heightRem: mmToRem(PULP_LOGIC_1U_HEIGHT_MM) },
  EURORACK_3U_ALT: { id: 1000, name: '3U Eurorack', heightRem: EURORACK_3U_HEIGHT_REM }
};

const GEOMETRY_BY_STANDARD_ID = new Map([
  [MODULE_FORMAT_GEOMETRY.EURORACK_3U.id, MODULE_FORMAT_GEOMETRY.EURORACK_3U],
  [MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.id, MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U],
  [MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U.id, MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U],
  [MODULE_FORMAT_GEOMETRY.EURORACK_3U_ALT.id, MODULE_FORMAT_GEOMETRY.EURORACK_3U_ALT]
]);

export function getModuleFormatGeometry(standardId) {
  if (standardId == null) {
    return MODULE_FORMAT_GEOMETRY.EURORACK_3U;
  }

  if (standardId === MODULE_FORMAT_GEOMETRY.EURORACK_3U.id || standardId === MODULE_FORMAT_GEOMETRY.EURORACK_3U_ALT.id) {
    return MODULE_FORMAT_GEOMETRY.EURORACK_3U;
  }

  return GEOMETRY_BY_STANDARD_ID.get(standardId) ?? MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U;
}

export function calculatePanelRatio({ hp, standardId, imageWidth, imageHeight, threshold = DEFAULT_PANEL_RATIO_THRESHOLD }) {
  if (!positiveNumber(hp) || !positiveNumber(imageWidth) || !positiveNumber(imageHeight)) {
    return null;
  }

  const expectedRatio = hp / getModuleFormatGeometry(standardId).heightRem;
  const imageRatio = imageWidth / imageHeight;
  const relativeDelta = (imageRatio - expectedRatio) / expectedRatio;

  return {
    expectedRatio,
    imageRatio,
    relativeDelta,
    deltaPercent: relativeDelta * 100,
    accepted: Math.abs(relativeDelta) <= threshold
  };
}

export function parseImageDimensions(buffer) {
  if (!(buffer instanceof Uint8Array) || buffer.length < 12) {
    return null;
  }

  return parsePngDimensions(buffer)
    ?? parseJpegDimensions(buffer)
    ?? parseWebpDimensions(buffer);
}

export async function auditPanelRatios(options = {}) {
  loadLocalEnv(options.envPath);

  const config = resolveConfig(options);
  progress(config, `Fetching modules with panels from ${ config.supabaseUrl }...`);
  const modules = await fetchAuditModules(config);
  const panelRows = modules.flatMap(module => normalizeModulePanels(module));
  const limitedRows = config.limit > 0 ? panelRows.slice(0, config.limit) : panelRows;
  progress(config, `Fetched ${ modules.length } modules / ${ panelRows.length } panels. Auditing ${ limitedRows.length } panels with threshold ${ formatPercent(config.threshold) }...`);
  const progressTracker = createPanelProgressTracker(limitedRows.length, config);
  const rows = await mapWithConcurrency(limitedRows, config.concurrency, async panelRow => {
    const row = await auditPanelRow(panelRow, config);
    progressTracker.record(row);
    return row;
  });
  const sortedRows = rows.sort(compareAuditRows);
  const summary = summarizeRows(sortedRows, config);
  progress(config, `Writing reports to ${ path.relative(process.cwd(), config.outputDir) }...`);
  const written = writeReports(sortedRows, summary, config);

  return {
    rows: sortedRows,
    summary,
    written
  };
}

function resolveConfig(options) {
  const args = parseArgs(options.argv ?? process.argv.slice(2));
  const supabaseUrl = stripTrailingSlash(options.supabaseUrl ?? args.supabaseUrl ?? process.env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL);
  const supabaseKey = options.supabaseKey
    ?? args.supabaseKey
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? '';

  return {
    supabaseUrl,
    supabaseKey,
    threshold: resolvePositiveNumber(options.threshold ?? args.threshold, DEFAULT_PANEL_RATIO_THRESHOLD),
    concurrency: Math.max(1, Math.floor(resolvePositiveNumber(options.concurrency ?? args.concurrency, DEFAULT_CONCURRENCY))),
    timeoutMs: Math.max(1000, Math.floor(resolvePositiveNumber(options.timeoutMs ?? args.timeoutMs, DEFAULT_TIMEOUT_MS))),
    limit: Math.max(0, Math.floor(resolveNumber(options.limit ?? args.limit, 0))),
    outputDir: path.resolve(options.outputDir ?? args.outputDir ?? DEFAULT_OUTPUT_DIR),
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
    now: options.now ?? new Date(),
    quiet: Boolean(options.quiet ?? args.quiet)
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
    if (!match) {
      continue;
    }

    const [, key, value] = match;
    args[toCamelCase(key)] = value;
  }
  return args;
}

async function fetchAuditModules(config) {
  if (!config.supabaseKey) {
    throw new Error('Missing SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY. Add it to your environment or local .env before running this audit.');
  }
  if (typeof config.fetchImpl !== 'function') {
    throw new Error('This script requires a runtime with fetch support.');
  }

  const rows = [];
  let panelCount = 0;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await fetchModulePage(offset, config);
    rows.push(...page);
    panelCount += countPanels(page);
    progress(config, `Fetched module page ${ Math.floor(offset / PAGE_SIZE) + 1 }: +${ page.length } modules (${ rows.length } modules / ${ panelCount } panels collected)`);
    if (page.length < PAGE_SIZE || (config.limit > 0 && panelCount >= config.limit)) {
      return rows;
    }
  }
}

async function fetchModulePage(offset, config) {
  const params = new URLSearchParams();
  params.set('select', 'id,name,hp,standardMeta:standards!modules_standard_fkey(id,name),panels:module_panels!inner(id,filename,description,color)');
  params.set('hp', 'not.is.null');
  params.set('order', 'id.asc');
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String(offset));

  const response = await fetchWithTimeout(`${ config.supabaseUrl }/rest/v1/modules?${ params.toString() }`, {
    headers: {
      apikey: config.supabaseKey,
      authorization: `Bearer ${ config.supabaseKey }`
    }
  }, config);

  if (!response.ok) {
    throw new Error(`Supabase module query failed (${ response.status }): ${ await response.text() }`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

function normalizeModulePanels(module) {
  const panels = Array.isArray(module.panels) ? module.panels : [];
  return panels.map(panel => ({
    moduleId: numberOrNull(module.id),
    moduleName: stringOrEmpty(module.name),
    hp: numberOrNull(module.hp),
    standardId: numberOrNull(module.standardMeta?.id),
    standardName: stringOrEmpty(module.standardMeta?.name),
    panelId: numberOrNull(panel.id),
    panelFilename: stringOrEmpty(panel.filename),
    panelDescription: stringOrEmpty(panel.description),
    panelColor: numberOrNull(panel.color)
  }));
}

function countPanels(modules) {
  return modules.reduce((total, module) => total + (Array.isArray(module.panels) ? module.panels.length : 0), 0);
}

async function auditPanelRow(panelRow, config) {
  const baseRow = {
    ...panelRow,
    expectedRatio: null,
    imageWidth: null,
    imageHeight: null,
    imageRatio: null,
    deltaPercent: null,
    status: 'error',
    error: ''
  };

  if (!panelRow.panelFilename) {
    return {
      ...baseRow,
      status: 'missing_filename',
      error: 'Panel row has no filename'
    };
  }

  try {
    const imageUrl = `${ config.supabaseUrl }/storage/v1/object/public/${ MODULE_PANELS_BUCKET }/${ encodeURIComponent(panelRow.panelFilename) }`;
    const response = await fetchWithTimeout(imageUrl, {}, config);
    if (!response.ok) {
      return {
        ...baseRow,
        status: 'image_fetch_error',
        error: `Image fetch failed (${ response.status })`
      };
    }

    const buffer = new Uint8Array(await response.arrayBuffer());
    const dimensions = parseImageDimensions(buffer);
    if (!dimensions) {
      return {
        ...baseRow,
        status: 'unsupported_image',
        error: 'Could not parse image dimensions'
      };
    }

    const ratio = calculatePanelRatio({
      hp: panelRow.hp,
      standardId: panelRow.standardId,
      imageWidth: dimensions.width,
      imageHeight: dimensions.height,
      threshold: config.threshold
    });

    if (!ratio) {
      return {
        ...baseRow,
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
        status: 'invalid_data',
        error: 'Missing or invalid HP/image dimensions'
      };
    }

    return {
      ...baseRow,
      expectedRatio: ratio.expectedRatio,
      imageWidth: dimensions.width,
      imageHeight: dimensions.height,
      imageRatio: ratio.imageRatio,
      deltaPercent: ratio.deltaPercent,
      status: ratio.accepted ? 'ok' : 'mismatch'
    };
  } catch (error) {
    return {
      ...baseRow,
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function summarizeRows(rows, config) {
  const counts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: config.now.toISOString(),
    threshold: config.threshold,
    totalPanels: rows.length,
    ok: counts.ok ?? 0,
    mismatches: counts.mismatch ?? 0,
    errors: rows.length - (counts.ok ?? 0) - (counts.mismatch ?? 0),
    counts
  };
}

function writeReports(rows, summary, config) {
  mkdirSync(config.outputDir, { recursive: true });
  const stamp = summary.generatedAt.replace(/[:.]/g, '-');
  const jsonPath = path.join(config.outputDir, `panel-ratio-audit-${ stamp }.json`);
  const csvPath = path.join(config.outputDir, `panel-ratio-audit-${ stamp }.csv`);

  writeFileSync(jsonPath, JSON.stringify({ summary, rows }, null, 2) + '\n', 'utf8');
  writeFileSync(csvPath, toCsv(rows), 'utf8');

  return { jsonPath, csvPath };
}

function toCsv(rows) {
  const columns = [
    'status',
    'deltaPercent',
    'moduleId',
    'moduleName',
    'hp',
    'standardId',
    'standardName',
    'panelId',
    'panelFilename',
    'imageWidth',
    'imageHeight',
    'expectedRatio',
    'imageRatio',
    'error'
  ];

  return [
    columns.join(','),
    ...rows.map(row => columns.map(column => csvCell(row[column])).join(','))
  ].join('\n') + '\n';
}

function compareAuditRows(a, b) {
  const statusScore = statusPriority(b.status) - statusPriority(a.status);
  if (statusScore !== 0) {
    return statusScore;
  }

  const aDelta = Math.abs(a.deltaPercent ?? 0);
  const bDelta = Math.abs(b.deltaPercent ?? 0);
  return bDelta - aDelta;
}

function statusPriority(status) {
  switch (status) {
    case 'mismatch':
      return 4;
    case 'error':
    case 'image_fetch_error':
    case 'unsupported_image':
    case 'invalid_data':
    case 'missing_filename':
      return 3;
    case 'ok':
      return 1;
    default:
      return 0;
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

function createPanelProgressTracker(total, config) {
  const counts = {};
  let completed = 0;
  let lastLoggedPercent = -1;
  const stepPercent = total >= 500 ? 5 : 10;

  if (total === 0) {
    progress(config, 'No panels to audit.');
    return { record: () => undefined };
  }

  progress(config, `Auditing panels: 0/${ total }`);

  return {
    record(row) {
      completed += 1;
      counts[row.status] = (counts[row.status] ?? 0) + 1;
      const percent = Math.floor((completed / total) * 100);
      const shouldLog = completed === total
        || completed === 1
        || percent >= lastLoggedPercent + stepPercent;

      if (!shouldLog) {
        return;
      }

      lastLoggedPercent = percent;
      progress(config, `Auditing panels: ${ completed }/${ total } (${ percent }%) — ok ${ counts.ok ?? 0 }, mismatches ${ counts.mismatch ?? 0 }, errors ${ completed - (counts.ok ?? 0) - (counts.mismatch ?? 0) }`);
    }
  };
}

function progress(config, message) {
  if (config.quiet) {
    return;
  }

  console.log(`[panel-ratio-audit] ${ message }`);
}

function formatPercent(value) {
  return `${ (value * 100).toFixed(2) }%`;
}

async function fetchWithTimeout(url, init, config) {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), config.timeoutMs);
  try {
    return await config.fetchImpl(url, {
      ...init,
      signal: abortController.signal
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function parsePngDimensions(buffer) {
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!pngSignature.every((byte, index) => buffer[index] === byte)) {
    return null;
  }
  if (ascii(buffer, 12, 4) !== 'IHDR') {
    return null;
  }

  return {
    width: readUint32BE(buffer, 16),
    height: readUint32BE(buffer, 20),
    type: 'png'
  };
}

function parseJpegDimensions(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (buffer[offset] === 0xff) {
      offset += 1;
    }

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = readUint16BE(buffer, offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      return null;
    }

    if (isJpegStartOfFrame(marker)) {
      return {
        width: readUint16BE(buffer, offset + 5),
        height: readUint16BE(buffer, offset + 3),
        type: 'jpeg'
      };
    }

    offset += segmentLength;
  }

  return null;
}

function parseWebpDimensions(buffer) {
  if (ascii(buffer, 0, 4) !== 'RIFF' || ascii(buffer, 8, 4) !== 'WEBP') {
    return null;
  }

  const chunkType = ascii(buffer, 12, 4);
  if (chunkType === 'VP8X' && buffer.length >= 30) {
    return {
      width: readUint24LE(buffer, 24) + 1,
      height: readUint24LE(buffer, 27) + 1,
      type: 'webp'
    };
  }

  if (chunkType === 'VP8L' && buffer.length >= 25) {
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      type: 'webp'
    };
  }

  if (chunkType === 'VP8 ' && buffer.length >= 30) {
    return {
      width: readUint16LE(buffer, 26) & 0x3fff,
      height: readUint16LE(buffer, 28) & 0x3fff,
      type: 'webp'
    };
  }

  return null;
}

function isJpegStartOfFrame(marker) {
  return [
    0xc0, 0xc1, 0xc2, 0xc3,
    0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb,
    0xcd, 0xce, 0xcf
  ].includes(marker);
}

function loadLocalEnv(envPath = '.env') {
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    if (process.env[key] != null) {
      continue;
    }
    process.env[key] = stripQuotes(rawValue);
  }
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readUint16BE(buffer, offset) {
  return (buffer[offset] << 8) | buffer[offset + 1];
}

function readUint16LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8);
}

function readUint24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function readUint32BE(buffer, offset) {
  return (buffer[offset] * 0x1000000) + ((buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3]);
}

function ascii(buffer, offset, length) {
  return String.fromCharCode(...buffer.slice(offset, offset + length));
}

function mmToRem(heightMm) {
  return Number((heightMm * REM_PER_MM).toFixed(4));
}

function positiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringOrEmpty(value) {
  return typeof value === 'string' ? value : '';
}

function resolvePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/+$/, '');
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function csvCell(value) {
  if (value == null) {
    return '';
  }

  const text = String(value);
  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${ text.replace(/"/g, '""') }"`;
}

function printHelp() {
  console.log(`Panel ratio audit

Usage:
  pnpm audit:panel-ratios [--threshold=0.01] [--concurrency=8] [--limit=0] [--output-dir=output/panel-ratio-audits] [--quiet]

Environment:
  SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is required.
  SUPABASE_URL defaults to ${ DEFAULT_SUPABASE_URL }.
`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  auditPanelRatios()
    .then(({ summary, written }) => {
      console.log(`✔ panel ratio audit complete — ${ summary.totalPanels } panels, ${ summary.mismatches } mismatches, ${ summary.errors } errors`);
      console.log(`  JSON: ${ path.relative(process.cwd(), written.jsonPath) }`);
      console.log(`  CSV:  ${ path.relative(process.cwd(), written.csvPath) }`);
    })
    .catch(error => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
