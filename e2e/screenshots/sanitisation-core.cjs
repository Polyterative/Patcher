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
  }
];
const FIXTURE_PREFIX_SOURCE = '^\\s*\\[E2E\\]';
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
