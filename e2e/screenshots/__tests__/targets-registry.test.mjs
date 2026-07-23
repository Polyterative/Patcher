import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import registry from '../targets.registry.cjs';

const rootDir = resolve(import.meta.dirname, '../../..');
const screenshotSpecSource = readFileSync(resolve(rootDir, 'e2e/screenshots/auth-major-area-screenshots.spec.ts'), 'utf8');
const {
  PUBLICATION_GATE_IDS,
  SCREENSHOT_TARGETS_REGISTRY
} = registry;
const testTitles = SCREENSHOT_TARGETS_REGISTRY.map(target => `captures ${ target.title }`);

test('screenshot target registry uses unique stable ids, filenames, and titles', () => {
  assert.equal(new Set(SCREENSHOT_TARGETS_REGISTRY.map(target => target.id)).size, SCREENSHOT_TARGETS_REGISTRY.length);
  assert.equal(new Set(SCREENSHOT_TARGETS_REGISTRY.map(target => target.fileName)).size, SCREENSHOT_TARGETS_REGISTRY.length);
  assert.equal(new Set(SCREENSHOT_TARGETS_REGISTRY.map(target => target.title)).size, SCREENSHOT_TARGETS_REGISTRY.length);
});

test('registered target titles map one-to-one to generated Playwright titles', () => {
  assert.match(screenshotSpecSource, /test\(`captures \$\{ target\.title \}`/);

  for (const title of testTitles) {
    const matches = testTitles.filter(candidate => candidate === title);
    assert.equal(matches.length, 1, `${ title } must identify exactly one screenshot test`);
  }
});

test('publication gate order is stable and excludes non-publication captures', () => {
  assert.deepEqual(PUBLICATION_GATE_IDS, [
    'home',
    'modules',
    'patch-details',
    'racks',
    'user-area',
    'account',
    'public-profile'
  ]);
});
