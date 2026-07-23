import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import {screenshotMap} from './docs-screenshot-map.mjs';

const rootDir = resolve(import.meta.dirname, '../..');
const screenshotSpecPath = resolve(rootDir, 'e2e/screenshots/auth-major-area-screenshots.spec.ts');
const screenshotSpecSource = readFileSync(screenshotSpecPath, 'utf8');
const screenshotTargets = [...screenshotSpecSource.matchAll(/fileName:\s*'([^']+\.jpg)'/g)].map(match => match[1]);

test('screenshot capture target names are unique and title-selected', () => {
  assert.equal(screenshotTargets.length, new Set(screenshotTargets).size);
  assert.match(screenshotSpecSource, /test\(`captures \$\{ target\.fileName \}`/);
});

test('docs screenshot sync map only references known capture targets', () => {
  assert.equal(screenshotMap.length, 7);
  assert.deepEqual(
    screenshotMap.find(([, target]) => target === 'patcher-patches.jpg'),
    ['05-patch-details.jpg', 'patcher-patches.jpg']
  );

  for (const [sourceName] of screenshotMap) {
    assert.ok(screenshotTargets.includes(sourceName), `${ sourceName } must be a known screenshot target`);
  }
});
