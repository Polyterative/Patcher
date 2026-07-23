import type { Page } from '@playwright/test';
import sanitisationCore = require('./sanitisation-core.cjs');


interface TextReplacement {
  source: string;
  flags: string;
  replacement: string;
}

interface SanitisationCore {
  DOCS_SCREENSHOT_HIDE_ATTRIBUTE: string;
  DOCS_SCREENSHOT_HIDE_STYLE_ID: string;
  FIXTURE_PREFIX_SOURCE: string;
  TEXT_REPLACEMENTS: TextReplacement[];
}

const {
  DOCS_SCREENSHOT_HIDE_ATTRIBUTE,
  DOCS_SCREENSHOT_HIDE_STYLE_ID,
  FIXTURE_PREFIX_SOURCE,
  TEXT_REPLACEMENTS
} = sanitisationCore as SanitisationCore;

const SCREENSHOT_HIDE_STYLE = `[${ DOCS_SCREENSHOT_HIDE_ATTRIBUTE }="true"] { display: none !important; }`;

export async function applyDocsScreenshotSanitisation(page: Page): Promise<void> {
  const accountId = await readCurrentAccountId(page);
  const accountLabel = await readCurrentAccountLabel(page);
  const accountIdReplacement = accountId
    ? {
      source: escapeRegExp(accountId),
      flags: 'g',
      replacement: 'Docs screenshot account'
    }
    : null;
  const accountLabelReplacement = accountLabel
    ? {
      source: escapeRegExp(accountLabel),
      flags: 'gi',
      replacement: 'Docs screenshot account'
    }
    : null;
  await page.evaluate((config) => {
    const ensureHideStyle = () => {
      if (document.getElementById(config.hideStyleId)) {
        return;
      }

      const style = document.createElement('style');
      style.id = config.hideStyleId;
      style.textContent = config.hideStyleText;
      document.head.appendChild(style);
    };
    const isVisible = (element: Element): boolean => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0
        && rect.width > 0
        && rect.height > 0;
    };
    const fixturePrefix = new RegExp(config.fixturePrefixSource, 'i');
    const cardSelector = [
      'lib-clean-card',
      'app-module-minimal',
      'app-rack-micro',
      'app-patch-micro',
      'app-hero-clickable-title',
      'app-hero-item-card',
      '.hero-item-card',
      '.module-list-card'
    ].join(',');
    const fixtureHideSelector = [
      'lib-clean-card',
      'app-module-minimal',
      'app-rack-micro',
      'app-patch-micro',
      'app-hero-item-card',
      '.hero-item-card',
      'li',
      'article',
      'mat-card'
    ].join(',');
    const listSelectors = [
      'app-user-racks',
      'app-user-patches',
      'app-user-modules',
      'app-rack-list',
      'app-patch-micro',
      'app-module-list',
      'app-module-browser-root'
    ];

    ensureHideStyle();

    for (const listSelector of listSelectors) {
      for (const root of document.querySelectorAll(listSelector)) {
        const candidates = [
          ...(root.matches(cardSelector) ? [root] : []),
          ...root.querySelectorAll(cardSelector)
        ];

        for (const candidate of candidates) {
          if (!isVisible(candidate)) {
            continue;
          }

          const text = (candidate.textContent ?? '').trim();
          if (!fixturePrefix.test(text)) {
            continue;
          }

          const hideTarget = candidate.closest(fixtureHideSelector) ?? candidate;
          hideTarget.setAttribute(config.hideAttribute, 'true');
        }
      }
    }

    for (const element of document.body.querySelectorAll('*')) {
      if (!isVisible(element)) {
        continue;
      }

      const hasDirectFixtureText = Array.from(element.childNodes)
        .some(node => node.nodeType === Node.TEXT_NODE && fixturePrefix.test(node.textContent ?? ''));
      if (!hasDirectFixtureText) {
        continue;
      }

      const hideTarget = element.closest(fixtureHideSelector) ?? element;
      hideTarget.setAttribute(config.hideAttribute, 'true');
    }

    const replacements = [
      ...config.textReplacements,
      ...(config.accountIdReplacement ? [config.accountIdReplacement] : []),
      ...(config.accountLabelReplacement ? [config.accountLabelReplacement] : [])
    ].map(replacement => ({
      pattern: new RegExp(replacement.source, replacement.flags),
      replacement: replacement.replacement
    }));
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();

    while (textNode) {
      let text = textNode.textContent ?? '';
      for (const replacement of replacements) {
        text = text.replace(replacement.pattern, replacement.replacement);
      }
      textNode.textContent = text;
      textNode = walker.nextNode();
    }
  }, {
    fixturePrefixSource: FIXTURE_PREFIX_SOURCE,
    accountIdReplacement,
    accountLabelReplacement,
    hideAttribute: DOCS_SCREENSHOT_HIDE_ATTRIBUTE,
    hideStyleId: DOCS_SCREENSHOT_HIDE_STYLE_ID,
    hideStyleText: SCREENSHOT_HIDE_STYLE,
    textReplacements: TEXT_REPLACEMENTS
  });
}

async function readCurrentAccountLabel(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const navLabel = document.querySelector('app-toolbar a[href$="/user/area"]')?.textContent?.trim();
    if (navLabel) {
      return navLabel;
    }

    const heading = Array.from(document.querySelectorAll('h1'))
      .map(element => element.textContent?.trim() ?? '')
      .find(text => /^USER AREA\s*-/i.test(text));
    return heading?.replace(/^USER AREA\s*-\s*/i, '').trim() || null;
  }).catch(() => null);
}

async function readCurrentAccountId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (!key?.includes('auth-token')) {
        continue;
      }

      try {
        const parsed = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
          user?: {id?: unknown};
          currentSession?: {user?: {id?: unknown}};
        };
        const directUserId = typeof parsed.user?.id === 'string' ? parsed.user.id : null;
        const sessionUserId = typeof parsed.currentSession?.user?.id === 'string'
          ? parsed.currentSession.user.id
          : null;
        return directUserId ?? sessionUserId;
      } catch {
        return null;
      }
    }

    return null;
  }).catch(() => null);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
