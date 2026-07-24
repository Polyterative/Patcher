import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DOCS_SCREENSHOT_HIDE_ATTRIBUTE,
  isFixtureOwnedText,
  replaceDocsScreenshotText
} from '../sanitisation-core.cjs';

test('rewrites docs screenshot account identifiers', () => {
  const rewritten = replaceDocsScreenshotText(
    'patcher-e2e-123@patcher.xyz patcher-e2e-123'
  );

  assert.equal(rewritten, 'docs-screenshot@patcher.xyz Docs screenshot account');
});

test('detects fixture-owned cards that should be hidden', () => {
  assert.equal(isFixtureOwnedText('[E2E] private fixture patch'), true);
  assert.equal(isFixtureOwnedText('  [e2e] private fixture rack'), true);
  assert.equal(isFixtureOwnedText('Docs-friendly public patch'), false);
  assert.equal(DOCS_SCREENSHOT_HIDE_ATTRIBUTE, 'data-docs-screenshot-hide');
});

test('redacts residual UUIDs from visible text', () => {
  const rewritten = replaceDocsScreenshotText(
    'Owner id 123e4567-e89b-12d3-a456-426614174000 on this card'
  );

  assert.equal(rewritten, 'Owner id [hidden-id] on this card');
});

test('redacts a real personal email address that is not the fixture pattern', () => {
  const rewritten = replaceDocsScreenshotText('Email Address vlady.y@live.it');

  assert.equal(rewritten, 'Email Address docs-screenshot@patcher.xyz');
});
