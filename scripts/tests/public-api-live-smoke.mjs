const DEFAULT_BASE_URL = 'https://api.patcher.xyz/v1';
const DEFAULT_TIMEOUT_MS = 10_000;
const API_KEY_PATTERN = /^pk_live_[A-Za-z0-9_-]{22}$/;

const MODULE_INCLUDES = ['ins', 'outs', 'panels', 'tags'];
const TAG_TYPES = new Set([
  'nature',
  'character',
  'voice',
  'source',
  'filter',
  'modulation',
  'effect',
  'sequencing',
  'utility',
  'blank',
]);
const PANEL_COLORS = new Set(['Light', 'Dark', 'Special edition', 'Limited edition']);

export class PublicApiSmokeError extends Error {
  constructor(label, message) {
    super(`${label}: ${message}`);
    this.name = 'PublicApiSmokeError';
    this.label = label;
  }
}

export async function runPublicApiSmoke(options = {}) {
  const context = {
    baseUrl: normalizeBaseUrl(
      options.baseUrl ?? process.env.PATCHER_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL
    ),
    fetchFn: options.fetchFn ?? globalThis.fetch,
    apiKey: options.apiKey ?? process.env.PATCHER_PUBLIC_API_KEY,
    timeoutMs: options.timeoutMs ?? readTimeoutMs(process.env.PATCHER_PUBLIC_API_TIMEOUT_MS),
    report: options.report ?? defaultReporter,
  };

  if (typeof context.fetchFn !== 'function') {
    throw new PublicApiSmokeError('setup', 'global fetch is unavailable');
  }

  await assertMissingAuthorization(context);
  context.apiKey = validateApiKey('PATCHER_PUBLIC_API_KEY', context.apiKey);

  const modules = await getJson(context, {
    label: 'modules list',
    endpoint: '/modules?limit=10&sort=id',
  });
  const moduleRows = assertListEnvelope(modules, 'modules list');
  assertNonEmpty(moduleRows, 'modules list');
  for (const [index, module] of moduleRows.entries()) {
    assertModule(module, `modules list.data[${index}]`);
  }

  for (const include of MODULE_INCLUDES) {
    await assertModuleInclude(context, [include], `modules include=${include}`);
  }
  await assertModuleInclude(context, MODULE_INCLUDES, 'modules include=ins,outs,panels,tags');

  await assertStandards(context);
  await assertTags(context);
  await assertHeadAndEtag(context);
}

export function validateApiKey(label, value) {
  if (typeof value !== 'string' || !API_KEY_PATTERN.test(value)) {
    throw new PublicApiSmokeError(
      'setup',
      `${label} must be set to a valid pk_live_ key shape`
    );
  }
  return value;
}

export function normalizeBaseUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PublicApiSmokeError('setup', 'base URL is required');
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new PublicApiSmokeError('setup', 'base URL must be an absolute URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new PublicApiSmokeError('setup', 'base URL must use http or https');
  }
  return parsed.toString().replace(/\/+$/, '');
}

async function assertMissingAuthorization(context) {
  const response = await request(context, {
    label: 'missing authorization',
    endpoint: '/modules?limit=1',
    auth: false,
    expectedStatus: 401,
  });
  const body = await readJson(response, 'missing authorization');
  assertErrorEnvelope(body, 'missing authorization', 'missing_authorization');
  assertHeaderEqualsBodyRequestId(response, body, 'missing authorization');
}

async function assertModuleInclude(context, includes, label) {
  const endpoint = `/modules?limit=100&sort=id&include=${includes.join(',')}`;
  const body = await getJson(context, { label, endpoint });
  const rows = assertListEnvelope(body, label);
  assertNonEmpty(rows, label);
  const totals = Object.fromEntries(includes.map(include => [include, 0]));

  for (const [index, module] of rows.entries()) {
    assertModule(module, `${label}.data[${index}]`);
    for (const include of includes) {
      const itemLabel = `${label}.data[${index}].${include}`;
      assert(
        Object.prototype.hasOwnProperty.call(module, include),
        itemLabel,
        'requested expansion is missing'
      );
      assert(Array.isArray(module[include]), itemLabel, 'requested expansion is not an array');
      totals[include] += module[include].length;
      for (const [childIndex, child] of module[include].entries()) {
        assertExpandedItem(include, child, `${itemLabel}[${childIndex}]`);
      }
    }
  }

  for (const include of includes) {
    assert(
      totals[include] > 0,
      `${label}.${include}`,
      `expected at least one non-empty ${include} expansion`
    );
  }
}

async function assertStandards(context) {
  const body = await getJson(context, {
    label: 'standards list',
    endpoint: '/standards?limit=100&sort=id',
  });
  const rows = assertListEnvelope(body, 'standards list');
  assertNonEmpty(rows, 'standards list');
  for (const [index, standard] of rows.entries()) {
    assertStandard(standard, `standards list.data[${index}]`);
  }
  assert(
    rows.some(standard => standard.id === 0 && standard.name === '3U'),
    'standards list',
    'expected standard id 0 named 3U'
  );
}

async function assertTags(context) {
  const body = await getJson(context, {
    label: 'tags list',
    endpoint: '/tags?limit=100&sort=id',
  });
  const rows = assertListEnvelope(body, 'tags list');
  assertNonEmpty(rows, 'tags list');
  for (const [index, tag] of rows.entries()) {
    assertTag(tag, `tags list.data[${index}]`);
  }
}

async function assertHeadAndEtag(context) {
  const head = await request(context, {
    label: 'modules HEAD',
    endpoint: '/modules?limit=1&sort=id',
    method: 'HEAD',
    expectedStatus: 200,
  });
  assertHeaderPresent(head, 'etag', 'modules HEAD');
  const headBody = await head.text();
  assert(headBody === '', 'modules HEAD', 'HEAD response must not include a body');

  const first = await request(context, {
    label: 'modules ETag seed',
    endpoint: '/modules?limit=1&sort=id',
    expectedStatus: 200,
  });
  const etag = first.headers.get('etag');
  assert(etag, 'modules ETag seed', 'ETag header is missing');
  await readJson(first, 'modules ETag seed');

  const notModified = await request(context, {
    label: 'modules If-None-Match',
    endpoint: '/modules?limit=1&sort=id',
    headers: { 'If-None-Match': etag },
    expectedStatus: 304,
  });
  const notModifiedBody = await notModified.text();
  assert(notModifiedBody === '', 'modules If-None-Match', '304 response must not include a body');
}

async function getJson(context, { label, endpoint }) {
  const response = await request(context, { label, endpoint, expectedStatus: 200 });
  assertHeaderPresent(response, 'etag', label);
  const contentType = response.headers.get('content-type') ?? '';
  assert(
    contentType.toLowerCase().includes('application/json'),
    label,
    'Content-Type must be JSON'
  );
  return readJson(response, label);
}

async function request(
  { baseUrl, fetchFn, apiKey, timeoutMs, report },
  { label, endpoint, method = 'GET', auth = true, headers = {}, expectedStatus }
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const requestHeaders = { ...headers };
  if (auth) {
    requestHeaders.Authorization = `Bearer ${apiKey}`;
  }

  let response;
  try {
    response = await fetchFn(`${baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error && typeof error === 'object' && error.name === 'AbortError';
    throw new PublicApiSmokeError(
      label,
      timedOut ? `request timed out after ${timeoutMs}ms` : 'request failed'
    );
  } finally {
    clearTimeout(timeout);
  }

  report({ label, status: response.status });
  if (response.status !== expectedStatus) {
    const errorCode = await safeErrorCode(response.clone());
    throw new PublicApiSmokeError(
      label,
      `expected ${expectedStatus}, received ${response.status}${errorCode ? ` (${errorCode})` : ''}`
    );
  }
  assertHeaderPresent(response, 'x-request-id', label);
  return response;
}

async function readJson(response, label) {
  let bodyText;
  try {
    bodyText = await response.text();
  } catch {
    throw new PublicApiSmokeError(label, 'failed to read response body');
  }
  assert(bodyText !== '', label, 'expected a JSON response body');
  try {
    return JSON.parse(bodyText);
  } catch {
    throw new PublicApiSmokeError(label, 'response body is not valid JSON');
  }
}

async function safeErrorCode(response) {
  try {
    const body = await response.json();
    return isRecord(body.error) && typeof body.error.code === 'string' ? body.error.code : null;
  } catch {
    return null;
  }
}

function assertErrorEnvelope(value, label, expectedCode) {
  assert(isRecord(value), label, 'error response must be an object');
  assert(isRecord(value.error), label, 'error envelope is missing');
  assert(value.error.code === expectedCode, label, `expected error code ${expectedCode}`);
  assert(typeof value.error.message === 'string', label, 'error message must be a string');
  assertRequestId(value.error.request_id, label);
}

function assertHeaderEqualsBodyRequestId(response, body, label) {
  assert(
    response.headers.get('x-request-id') === body.error.request_id,
    label,
    'X-Request-ID must match error.request_id'
  );
}

function assertListEnvelope(value, label) {
  assert(isRecord(value), label, 'response envelope must be an object');
  assert(Array.isArray(value.data), label, 'data must be an array');
  assert(isRecord(value.page), label, 'page envelope is missing');
  assert(
    typeof value.page.next_cursor === 'string' || value.page.next_cursor === null,
    label,
    'page.next_cursor must be a string or null'
  );
  return value.data;
}

function assertModule(value, label) {
  assert(isRecord(value), label, 'module must be an object');
  assertPositiveSafeInteger(value.id, `${label}.id`);
  assertString(value.name, `${label}.name`);
  assertNullableString(value.description, `${label}.description`);
  assertNullableInteger(value.hp, `${label}.hp`);
  assertNullableNonnegativeInteger(value.standard, `${label}.standard`);
  assertNullablePositiveInteger(value.manufacturer_id, `${label}.manufacturer_id`);
  assertNullableFiniteNumber(value.depth, `${label}.depth`);
  assertNullableFiniteNumber(value.depth_max, `${label}.depth_max`);
  assertNullableBoolean(value.is_diy, `${label}.is_diy`);
  assertNullableString(value.manual_url, `${label}.manual_url`);
  assertNullableFiniteNumber(value.power_neg_12, `${label}.power_neg_12`);
  assertNullableFiniteNumber(value.power_pos_12, `${label}.power_pos_12`);
  assertNullableFiniteNumber(value.power_pos_5, `${label}.power_pos_5`);
  assertNullableFiniteNumber(value.weight, `${label}.weight`);
  assertSwitches(value.switches, `${label}.switches`);
}

function assertExpandedItem(include, value, label) {
  switch (include) {
    case 'ins':
    case 'outs':
      assertPort(value, label);
      break;
    case 'panels':
      assertPanel(value, label);
      break;
    case 'tags':
      assertTag(value, label);
      break;
    default:
      throw new PublicApiSmokeError(label, 'unknown include validator');
  }
}

function assertPort(value, label) {
  assert(isRecord(value), label, 'port must be an object');
  assertPositiveSafeInteger(value.id, `${label}.id`);
  assertString(value.name, `${label}.name`);
  assertNullableBoolean(value.is_audio, `${label}.is_audio`);
  assertNullableBoolean(value.is_dcc, `${label}.is_dcc`);
  assertNullableBoolean(value.is_voct, `${label}.is_voct`);
  assertNullableFiniteNumber(value.min, `${label}.min`);
  assertNullableFiniteNumber(value.max, `${label}.max`);
  if (value.min !== null && value.max !== null) {
    assert(value.min <= value.max, label, 'min must not be greater than max');
  }
}

function assertPanel(value, label) {
  assert(isRecord(value), label, 'panel must be an object');
  assertPositiveSafeInteger(value.id, `${label}.id`);
  assert(
    value.color === null || PANEL_COLORS.has(value.color),
    `${label}.color`,
    'panel color must be a documented value or null'
  );
  assertNullableString(value.description, `${label}.description`);
  for (const forbiddenKey of ['filename', 'image_url', 'imageUrl', 'url']) {
    assert(!(forbiddenKey in value), label, `panel must not expose ${forbiddenKey}`);
  }
}

function assertTag(value, label) {
  assert(isRecord(value), label, 'tag must be an object');
  assertPositiveSafeInteger(value.id, `${label}.id`);
  assertString(value.name, `${label}.name`);
  assert(
    value.type === null || TAG_TYPES.has(value.type),
    `${label}.type`,
    'tag type must be a documented semantic enum or null'
  );
}

function assertStandard(value, label) {
  assert(isRecord(value), label, 'standard must be an object');
  assertNonnegativeSafeInteger(value.id, `${label}.id`);
  assertString(value.name, `${label}.name`);
}

function assertSwitches(value, label) {
  if (value === null) {
    return;
  }
  assert(Array.isArray(value), label, 'switches must be an array or null');
  for (const [index, item] of value.entries()) {
    const itemLabel = `${label}[${index}]`;
    assert(isRecord(item), itemLabel, 'switch must be an object');
    assertString(item.name, `${itemLabel}.name`);
    assert(Array.isArray(item.positions), `${itemLabel}.positions`, 'positions must be an array');
    for (const [positionIndex, position] of item.positions.entries()) {
      assertString(position, `${itemLabel}.positions[${positionIndex}]`);
    }
  }
}

function assertHeaderPresent(response, header, label) {
  assert(response.headers.get(header), label, `${header} header is missing`);
}

function assertNonEmpty(rows, label) {
  assert(rows.length > 0, label, 'expected at least one row');
}

function assertString(value, label) {
  assert(typeof value === 'string', label, 'must be a string');
}

function assertNullableString(value, label) {
  assert(value === null || typeof value === 'string', label, 'must be a string or null');
}

function assertNullableBoolean(value, label) {
  assert(value === null || typeof value === 'boolean', label, 'must be a boolean or null');
}

function assertNullableInteger(value, label) {
  assert(value === null || Number.isInteger(value), label, 'must be an integer or null');
}

function assertNullablePositiveInteger(value, label) {
  assert(
    value === null || (Number.isSafeInteger(value) && value > 0),
    label,
    'must be a positive safe integer or null'
  );
}

function assertNullableNonnegativeInteger(value, label) {
  assert(
    value === null || (Number.isSafeInteger(value) && value >= 0),
    label,
    'must be a nonnegative safe integer or null'
  );
}

function assertNullableFiniteNumber(value, label) {
  assert(value === null || isFiniteNumber(value), label, 'must be a finite number or null');
}

function assertPositiveSafeInteger(value, label) {
  assert(Number.isSafeInteger(value) && value > 0, label, 'must be a positive safe integer');
}

function assertNonnegativeSafeInteger(value, label) {
  assert(Number.isSafeInteger(value) && value >= 0, label, 'must be a nonnegative safe integer');
}

function assertRequestId(value, label) {
  assert(
    typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value),
    label,
    'request_id must be a UUID'
  );
}

function assert(condition, label, message) {
  if (!condition) {
    throw new PublicApiSmokeError(label, message);
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function readTimeoutMs(value) {
  if (!value) {
    return DEFAULT_TIMEOUT_MS;
  }
  const timeoutMs = Number(value);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000) {
    throw new PublicApiSmokeError(
      'setup',
      'PATCHER_PUBLIC_API_TIMEOUT_MS must be an integer from 1000 to 60000'
    );
  }
  return timeoutMs;
}

function defaultReporter({ label, status }) {
  console.log(`${label}: ${status}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    await runPublicApiSmoke();
    console.log('public API smoke passed');
  } catch (error) {
    if (error instanceof PublicApiSmokeError) {
      console.error(error.message);
      process.exitCode = 1;
    } else {
      console.error('public API smoke failed');
      process.exitCode = 1;
    }
  }
}
import { fileURLToPath } from 'node:url';
