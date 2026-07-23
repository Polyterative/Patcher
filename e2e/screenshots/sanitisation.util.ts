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

/**
 * Capture-time fallback for docs-facing containers that would otherwise render
 * completely empty once `[E2E]` fixture cards are hidden. When a section has
 * zero non-fixture cards, up to `maxCards` (default 2) existing fixture cards
 * are kept visible and their title text is rewritten to a deterministic,
 * non-identifying label (e.g. "Example rack 1"). No backend data is read,
 * created, or mutated by this fallback; it only mutates the rendered DOM of
 * the current page for the screenshot.
 */
export interface FixtureRetentionSection {
  /** Selector for the section root (e.g. `app-user-racks`). */
  containerSelector: string;
  /** Selector (relative to the container) identifying one card/row. */
  cardSelector: string;
  /** Selector (relative to a card) for the element holding the visible title text. */
  titleSelector: string;
  /** Deterministic label prefix, e.g. "Example rack". */
  label: string;
  /** Maximum number of fixture cards to retain per section. Defaults to 2. */
  maxCards?: number;
}

const {
  DOCS_SCREENSHOT_HIDE_ATTRIBUTE,
  DOCS_SCREENSHOT_HIDE_STYLE_ID,
  FIXTURE_PREFIX_SOURCE,
  TEXT_REPLACEMENTS
} = sanitisationCore as SanitisationCore;

const SCREENSHOT_HIDE_STYLE = `[${ DOCS_SCREENSHOT_HIDE_ATTRIBUTE }="true"] { display: none !important; }`;

export async function applyDocsScreenshotSanitisation(
  page: Page,
  options?: {fixtureRetention?: FixtureRetentionSection[]}
): Promise<void> {
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

    const unhideChain = (start: Element, container: Element) => {
      let node: Element | null = start;
      while (node) {
        if (node.hasAttribute(config.hideAttribute)) {
          node.removeAttribute(config.hideAttribute);
        }
        if (node === container) {
          break;
        }
        node = node.parentElement;
      }
    };

    for (const section of config.fixtureRetention) {
      const maxCards = section.maxCards ?? 2;
      for (const container of document.querySelectorAll(section.containerSelector)) {
        const cards = Array.from(container.querySelectorAll(section.cardSelector));
        const hasNonFixtureVisibleCard = cards.some(
          card => isVisible(card) && !card.hasAttribute(config.hideAttribute)
        );
        if (hasNonFixtureVisibleCard) {
          continue;
        }

        const retainedCards = cards
          .filter(card => card.hasAttribute(config.hideAttribute))
          .slice(0, maxCards);

        retainedCards.forEach((card, index) => {
          unhideChain(card, container);
          const titleElement = card.querySelector(section.titleSelector) ?? card;
          titleElement.textContent = `${ section.label } ${ index + 1 }`;
        });
      }
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
    textReplacements: TEXT_REPLACEMENTS,
    fixtureRetention: options?.fixtureRetention ?? []
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
