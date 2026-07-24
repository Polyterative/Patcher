const TEXT_REPLACEMENTS = [
  {
    source: '\\bpatcher-e2e-\\d+@patcher\\.xyz\\b',
    flags: 'gi',
    replacement: 'docs-screenshot@patcher.xyz'
  },
  {
    source: '\\bpatcher-e2e-\\d+\\b',
    flags: 'gi',
    replacement: 'Docs screenshot account'
  },
  {
    source: '\\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\b',
    flags: 'gi',
    replacement: '[hidden-id]'
  },
  // Generic catch-all for any remaining email address (e.g. a real personal
  // address on the authenticated docs-screenshot test account) that doesn't
  // match the patcher-e2e fixture pattern above. Runs last so it is a no-op
  // against the already-sanitised docs-screenshot@patcher.xyz replacement.
  {
    source: '\\b[\\w.+-]+@[\\w-]+\\.[a-z]{2,}\\b',
    flags: 'gi',
    replacement: 'docs-screenshot@patcher.xyz'
  }
];
const FIXTURE_PREFIX_SOURCE = '\\[E2E\\]';
const DOCS_SCREENSHOT_HIDE_ATTRIBUTE = 'data-docs-screenshot-hide';
const DOCS_SCREENSHOT_HIDE_STYLE_ID = 'docs-screenshot-hide-style';
const DOCS_SCREENSHOT_HIDE_SELECTOR = `[${ DOCS_SCREENSHOT_HIDE_ATTRIBUTE }="true"]`;

function replaceDocsScreenshotText(text) {
  return TEXT_REPLACEMENTS.reduce(
    (current, replacement) => current.replace(new RegExp(replacement.source, replacement.flags), replacement.replacement),
    text
  );
}

function isFixtureOwnedText(text) {
  return new RegExp(FIXTURE_PREFIX_SOURCE, 'i').test(text);
}

module.exports = {
  DOCS_SCREENSHOT_HIDE_ATTRIBUTE,
  DOCS_SCREENSHOT_HIDE_SELECTOR,
  DOCS_SCREENSHOT_HIDE_STYLE_ID,
  FIXTURE_PREFIX_SOURCE,
  TEXT_REPLACEMENTS,
  isFixtureOwnedText,
  replaceDocsScreenshotText
};
