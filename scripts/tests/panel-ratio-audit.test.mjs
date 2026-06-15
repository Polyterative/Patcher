import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  auditPanelRatios,
  calculatePanelRatio,
  DEFAULT_PANEL_RATIO_THRESHOLD,
  getModuleFormatGeometry,
  parseImageDimensions
} from '../audit-panel-ratios.mjs';

test('calculates accepted 3U panel ratio with default threshold', () => {
  const result = calculatePanelRatio({
    hp: 14,
    standardId: 0,
    imageWidth: 1006,
    imageHeight: 1837
  });

  assert.ok(result);
  assert.equal(DEFAULT_PANEL_RATIO_THRESHOLD, 0.01);
  assert.equal(getModuleFormatGeometry(0).heightRem, 25.4);
  assert.equal(result.accepted, true);
  assert.equal(result.expectedRatio.toFixed(6), (14 / 25.4).toFixed(6));
  assert.equal(result.imageRatio.toFixed(6), (1006 / 1837).toFixed(6));
});

test('calculates 1U standards with canonical heights', () => {
  assert.equal(getModuleFormatGeometry(1).heightRem, 7.8374);
  assert.equal(getModuleFormatGeometry(2).heightRem, 8.5352);

  const intellijel = calculatePanelRatio({
    hp: 10,
    standardId: 1,
    imageWidth: 1000,
    imageHeight: 784
  });
  const pulpLogic = calculatePanelRatio({
    hp: 10,
    standardId: 2,
    imageWidth: 1000,
    imageHeight: 854
  });

  assert.ok(intellijel);
  assert.ok(pulpLogic);
  assert.equal(intellijel.expectedRatio.toFixed(6), (10 / 7.8374).toFixed(6));
  assert.equal(pulpLogic.expectedRatio.toFixed(6), (10 / 8.5352).toFixed(6));
});

test('marks out-of-threshold ratios as mismatches', () => {
  const result = calculatePanelRatio({
    hp: 14,
    standardId: 0,
    imageWidth: 800,
    imageHeight: 1837
  });

  assert.ok(result);
  assert.equal(result.accepted, false);
});

test('parses PNG image dimensions from header', () => {
  const buffer = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x03, 0xee,
    0x00, 0x00, 0x07, 0x2d
  ]);

  assert.deepEqual(parseImageDimensions(buffer), {
    width: 1006,
    height: 1837,
    type: 'png'
  });
});

test('parses JPEG image dimensions from SOF header', () => {
  const buffer = new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0,
    0x00, 0x04,
    0x00, 0x00,
    0xff, 0xc0,
    0x00, 0x11,
    0x08,
    0x07, 0x2d,
    0x03, 0xee,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00
  ]);

  assert.deepEqual(parseImageDimensions(buffer), {
    width: 1006,
    height: 1837,
    type: 'jpeg'
  });
});

test('quiet audit mode suppresses progress output for imported use', async () => {
  const originalLog = console.log;
  const logs = [];
  console.log = message => logs.push(message);

  try {
    await auditPanelRatios({
      quiet: true,
      supabaseKey: 'test-key',
      outputDir: 'tmp/panel-ratio-audit-test',
      fetchImpl: async url => {
        if (String(url).includes('/rest/v1/modules')) {
          return jsonResponse([]);
        }

        throw new Error(`Unexpected fetch: ${ url }`);
      },
      now: new Date('2026-06-15T00:00:00.000Z')
    });
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(logs, []);
});

test('limited audits stop fetching module pages once enough panels are collected', async () => {
  const urls = [];

  await auditPanelRatios({
    quiet: true,
    supabaseKey: 'test-key',
    outputDir: 'tmp/panel-ratio-audit-test',
    limit: 2,
    fetchImpl: async url => {
      urls.push(String(url));
      if (String(url).includes('/rest/v1/modules')) {
        return jsonResponse([
          moduleResponse(1, 'a.jpg'),
          moduleResponse(2, 'b.jpg'),
          moduleResponse(3, 'c.jpg')
        ]);
      }

      return imageResponse(jpegHeader(1006, 1837));
    },
    now: new Date('2026-06-15T00:00:00.000Z')
  });

  assert.equal(urls.filter(url => url.includes('/rest/v1/modules')).length, 1);
  assert.equal(urls.filter(url => url.includes('/storage/v1/object/public/module-panels/')).length, 2);
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
    }
  };
}

function imageResponse(buffer) {
  return {
    ok: true,
    status: 200,
    async arrayBuffer() {
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    },
    async text() {
      return '';
    }
  };
}

function moduleResponse(id, filename) {
  return {
    id,
    name: `Module ${ id }`,
    hp: 14,
    standardMeta: { id: 0, name: '3U' },
    panels: [{ id, filename, description: '', color: 1 }]
  };
}

function jpegHeader(width, height) {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x11,
    0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00
  ]);
}
