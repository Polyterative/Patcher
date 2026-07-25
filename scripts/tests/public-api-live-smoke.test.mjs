import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import {
  PublicApiSmokeError,
  normalizeBaseUrl,
  runPublicApiSmoke,
  validateApiKey,
} from './public-api-live-smoke.mjs';

const apiKey = `pk_live_${'a'.repeat(22)}`;
let server;
let baseUrl;

before(async () => {
  server = createServer((request, response) => {
    void handleRequest(request, response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}/v1`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
});

test('runs the full smoke contract against an injected local server', async () => {
  const reports = [];
  await runPublicApiSmoke({
    apiKey,
    baseUrl,
    timeoutMs: 2_000,
    report: event => reports.push(event),
  });

  assert.deepEqual(
    reports.map(event => `${event.label}:${event.status}`),
    [
      'missing authorization:401',
      'modules list:200',
      'modules include=ins:200',
      'modules include=outs:200',
      'modules include=panels:200',
      'modules include=tags:200',
      'modules include=ins,outs,panels,tags:200',
      'standards list:200',
      'tags list:200',
      'modules HEAD:200',
      'modules ETag seed:200',
      'modules If-None-Match:304',
    ]
  );
});

test('rejects invalid key shapes without echoing the supplied value', () => {
  const badKey = 'pk_live_not-a-real-live-key';
  assert.throws(
    () => validateApiKey('PATCHER_PUBLIC_API_KEY', badKey),
    error => {
      assert(error instanceof PublicApiSmokeError);
      assert.match(error.message, /PATCHER_PUBLIC_API_KEY/);
      assert.doesNotMatch(error.message, /not-a-real-live-key/);
      return true;
    }
  );
});

test('normalizes the base URL for local smoke overrides', () => {
  assert.equal(normalizeBaseUrl(`${baseUrl}///`), baseUrl);
  assert.throws(() => normalizeBaseUrl('file:///not-supported'), /http or https/);
});

async function handleRequest(request, response) {
  const url = new URL(request.url, baseUrl);
  const requestId = '00000000-0000-4000-8000-000000000001';
  response.setHeader('X-Request-ID', requestId);

  if (!request.headers.authorization) {
    writeJson(response, 401, {
      error: {
        code: 'missing_authorization',
        message: 'Authorization header is required',
        request_id: requestId,
      },
    });
    return;
  }

  if (request.headers.authorization !== `Bearer ${apiKey}`) {
    writeJson(response, 401, {
      error: {
        code: 'invalid_key',
        message: 'API key is invalid',
        request_id: requestId,
      },
    });
    return;
  }

  if (request.method === 'HEAD' && url.pathname === '/v1/modules') {
    response.writeHead(200, {
      ETag: '"modules-one"',
      'Content-Type': 'application/json; charset=utf-8',
    });
    response.end();
    return;
  }

  if (request.headers['if-none-match'] === '"modules-one"') {
    response.writeHead(304, { ETag: '"modules-one"' });
    response.end();
    return;
  }

  if (request.method !== 'GET') {
    response.writeHead(405);
    response.end();
    return;
  }

  if (url.pathname === '/v1/modules') {
    writeJson(response, 200, modulesResponse(url.searchParams), '"modules-one"');
    return;
  }

  if (url.pathname === '/v1/standards') {
    writeJson(response, 200, {
      data: [
        { id: 0, name: '3U' },
        { id: 1, name: 'Eurorack' },
      ],
      page: { next_cursor: null },
    });
    return;
  }

  if (url.pathname === '/v1/tags') {
    writeJson(response, 200, {
      data: [
        { id: 1, name: 'Analog', type: 'nature' },
        { id: 2, name: 'Wildcard', type: null },
      ],
      page: { next_cursor: null },
    });
    return;
  }

  response.writeHead(404);
  response.end();
}

function modulesResponse(searchParams) {
  const includes = new Set((searchParams.get('include') ?? '').split(',').filter(Boolean));
  return {
    data: [
      moduleFixture(1, includes, {
        ins: [portFixture(101)],
        outs: [portFixture(201)],
        panels: [panelFixture(9007199254740991)],
        tags: [{ id: 1, name: 'Analog', type: 'nature' }],
      }),
      moduleFixture(2, includes, {
        ins: [],
        outs: [],
        panels: [],
        tags: [],
      }),
    ],
    page: { next_cursor: 'eyJ2IjoxLCJzIjoyLCJpZCI6Mn0' },
  };
}

function moduleFixture(id, includes, expansions) {
  const module = {
    id,
    name: `Module ${id}`,
    description: id === 1 ? 'A public module' : null,
    hp: 8,
    standard: id === 1 ? 0 : 1,
    manufacturer_id: 10,
    depth: 35,
    depth_max: null,
    is_diy: null,
    manual_url: null,
    power_neg_12: -20,
    power_pos_12: 40,
    power_pos_5: 0,
    switches: [{ name: 'Mode', positions: ['A', 'B'] }],
    weight: null,
  };
  for (const include of includes) {
    module[include] = expansions[include];
  }
  return module;
}

function portFixture(id) {
  return {
    id,
    name: `Port ${id}`,
    is_audio: true,
    is_dcc: null,
    is_voct: false,
    min: -5,
    max: 5,
  };
}

function panelFixture(id) {
  return {
    id,
    color: 'Light',
    description: 'Factory panel',
  };
}

function writeJson(response, status, body, etag = '"fixture-etag"') {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ETag: etag,
  });
  response.end(JSON.stringify(body));
}
