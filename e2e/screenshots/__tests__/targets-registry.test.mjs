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
import targetSelection from '../target-selection.cjs';
const {
  buildTargetGrep,
  captureTitleForTarget,
  resolveScreenshotTarget
} = targetSelection;
const testTitles = SCREENSHOT_TARGETS_REGISTRY.map(target => `captures ${ target.title }`);

test('screenshot target registry uses unique stable ids, filenames, and titles', () => {
  assert.equal(new Set(SCREENSHOT_TARGETS_REGISTRY.map(target => target.id)).size, SCREENSHOT_TARGETS_REGISTRY.length);
  assert.equal(new Set(SCREENSHOT_TARGETS_REGISTRY.map(target => target.fileName)).size, SCREENSHOT_TARGETS_REGISTRY.length);
  assert.equal(new Set(SCREENSHOT_TARGETS_REGISTRY.map(target => target.title)).size, SCREENSHOT_TARGETS_REGISTRY.length);
});

test('registered target titles map one-to-one to generated Playwright titles and output files', () => {
  assert.match(screenshotSpecSource, /test\(`captures \$\{ target\.title \}`/);

  for (const target of SCREENSHOT_TARGETS_REGISTRY) {
    const resolved = resolveScreenshotTarget(target.id);
    assert.deepEqual(resolved, target, `${ target.id } must resolve back to the same registry row`);
    assert.equal(captureTitleForTarget(target), `captures ${ target.title }`);
    assert.equal(
      SCREENSHOT_TARGETS_REGISTRY.filter(candidate => buildTargetGrep(target) === buildTargetGrep(candidate)).length,
      1,
      `${ target.id } grep must match exactly one registry title`
    );
    assert.equal(
      SCREENSHOT_TARGETS_REGISTRY.filter(candidate => candidate.fileName === target.fileName).length,
      1,
      `${ target.id } output file must be unique`
    );
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
