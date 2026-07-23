import assert from 'node:assert/strict';
import test from 'node:test';
import registry from '../../e2e/screenshots/targets.registry.cjs';
import {screenshotMap} from './docs-screenshot-map.mjs';

const {
  PUBLICATION_GATE_IDS,
  SCREENSHOT_TARGETS_REGISTRY
} = registry;
const targetByFileName = new Map(SCREENSHOT_TARGETS_REGISTRY.map(target => [target.fileName, target]));

test('docs screenshot sync map references exactly the publication gates in order', () => {
  assert.deepEqual(
    screenshotMap.map(([sourceName]) => targetByFileName.get(sourceName)?.id),
    PUBLICATION_GATE_IDS
  );
  assert.deepEqual(
    screenshotMap.find(([, target]) => target === 'patcher-patches.jpg'),
    ['05-patch-details.jpg', 'patcher-patches.jpg']
  );
});
