import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DOCS_SCREENSHOT_HIDE_ATTRIBUTE,
  isFixtureOwnedText,
  replaceDocsScreenshotText
} from '../sanitisation-core.cjs';

test('rewrites docs screenshot account identifiers', () => {
  const rewritten = replaceDocsScreenshotText(
    'patcher-e2e-123@patcher.xyz patcher-e2e-123 05af5f8e-f04e-4668-b247-52d292f7a99a'
  );

  assert.equal(rewritten, 'docs@patcher.xyz Docs account Docs account');
});

test('detects fixture-owned cards that should be hidden', () => {
  assert.equal(isFixtureOwnedText('[E2E] private fixture patch'), true);
  assert.equal(isFixtureOwnedText('  [e2e] private fixture rack'), true);
  assert.equal(isFixtureOwnedText('Docs-friendly public patch'), false);
  assert.equal(DOCS_SCREENSHOT_HIDE_ATTRIBUTE, 'data-docs-screenshot-hide');
});
