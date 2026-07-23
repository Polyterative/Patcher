import fs from 'node:fs';
import path from 'node:path';
import {
  expect,
  type BrowserContext,
  type Page,
  test
} from '@playwright/test';
import {
  BlockedScreenshotError,
  openBestOwnedPatchDetailsInEditMode
} from '../helpers/user-owned-entities';
import { applyDocsScreenshotSanitisation } from './sanitisation.util';


const OUTPUT_DIR = path.resolve(process.cwd(), 'src/assets/screenshots/major-area-screenshots');
const DESKTOP_VIEWPORT = {
  width: 1920,
  height: 1080
};
const SCREENSHOT_DELAY_MS = 120;
const DEFAULT_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxODA4NDU1OCwiZXhwIjoxOTMzNjYwNTU4fQ.3pSLsqyaCAGgISvOrHMt2CIX9hQowty2r8etzMwlpy8';
const SCREENSHOT_MOTION_STYLE = `
  *,
  *::before,
  *::after {
    animation-delay: -1ms !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-delay: 0s !important;
    transition-duration: 0s !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
`;
let publicConnectedPatchIdPromise: Promise<number> | undefined;

interface ScreenshotTarget {
  fileName: string;
  prepare: (page: Page) => Promise<void>;
  focusSelector: string;
  readyScopeSelector?: string;
  settleDelayMs?: number;
  authenticated?: boolean;
  validateAfterSanitisation?: (page: Page) => Promise<void>;
}

function ensureOutputDir(): void {
  fs.mkdirSync(OUTPUT_DIR, {recursive: true});
}

async function installScreenshotMode(page: Page): Promise<void> {
  await page.addInitScript((styleText: string) => {
    const install = () => {
      if (document.querySelector('style[data-screenshot-mode="true"]')) {
        return;
      }

      const style = document.createElement('style');
      style.dataset['screenshotMode'] = 'true';
      style.textContent = styleText;
      document.head.appendChild(style);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', install, {once: true});
      return;
    }

    install();
  }, SCREENSHOT_MOTION_STYLE);
}

async function getPublicConnectedPatchId(): Promise<number> {
  if (!publicConnectedPatchIdPromise) {
    publicConnectedPatchIdPromise = (async () => {
      const supabaseUrl = (process.env['SUPABASE_URL'] || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
      const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'] || DEFAULT_SUPABASE_ANON_KEY;
      const query = new URLSearchParams({
        select: 'patchid,patch:patches!patch_connections_patchid_fkey!inner(id,public)',
        'patch.public': 'eq.true',
        limit: '1'
      });

      const response = await fetch(`${ supabaseUrl }/rest/v1/patch_connections?${ query.toString() }`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${ supabaseAnonKey }`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch public connected patch (${ response.status })`);
      }

      const rows = await response.json() as Array<{patchid?: number}>;
      const patchId = rows.find(row => typeof row.patchid === 'number')?.patchid;
      if (!patchId) {
        throw new Error('No public patch with saved connections was found for the home screenshot.');
      }

      return patchId;
    })();
  }

  return publicConnectedPatchIdPromise;
}

async function setHomeHeroPatch(page: Page, patchId: number): Promise<void> {
  await page.waitForTimeout(1_200);
  await page.waitForFunction((resolvedPatchId: number) => {
    const ng = (window as {ng?: {getComponent?: (element: Element) => any}}).ng;
    if (!ng?.getComponent) {
      return false;
    }

    const heroRoot = document.querySelector('app-home-experience-hero');
    if (!heroRoot) {
      return false;
    }

    const component = ng.getComponent(heroRoot);
    component?.patchDetailDataService?.updateSinglePatchData$?.next(resolvedPatchId);
    return true;
  }, patchId, {timeout: 20_000});
}

async function revealHomeHeroGraph(page: Page): Promise<boolean> {
  return page.waitForFunction(
    () => {
      const ng = (window as {ng?: {getComponent?: (element: Element) => any}}).ng;
      const patchGraphHost = document.querySelector('app-home-experience-hero .patch-graph-shell app-patch-graph');
      if (!ng?.getComponent || !patchGraphHost) {
        return false;
      }

      const patchGraphComponent = ng.getComponent(patchGraphHost);
      const hasGraphData = (patchGraphComponent?.nodes$?.value?.length ?? 0) > 0;
      if (!hasGraphData) {
        return false;
      }

      return !patchGraphHost.textContent?.includes('Building graph...');
    },
    undefined,
    {timeout: 20_000}
  ).then(() => true).catch(() => false);
}

async function captureViewport(
  page: Page,
  target: ScreenshotTarget
): Promise<void> {
  await waitForScreenshotReady(page, target.focusSelector, target.readyScopeSelector ?? target.focusSelector);
  await page.waitForTimeout(target.settleDelayMs ?? SCREENSHOT_DELAY_MS);
  await applyDocsScreenshotSanitisation(page);
  await target.validateAfterSanitisation?.(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, target.fileName),
    fullPage: false,
    type: 'jpeg',
    quality: 82
  });
}

async function centerElementOnViewport(page: Page, selector: string): Promise<void> {
  const centered = await page.evaluate((selectorText: string) => {
    const element = document.querySelector(selectorText);
    if (!element) {
      return false;
    }
    
    const rect = element.getBoundingClientRect();
    const top = window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2);
    window.scrollTo({
      top: Math.max(0, top),
      behavior: 'auto'
    });
    return true;
  }, selector);
  
  expect(centered).toBeTruthy();
}

async function waitForScreenshotReady(page: Page, focusSelector: string, readyScopeSelector: string): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator(focusSelector).first()).toBeVisible({timeout: 20_000});

  await page.waitForFunction(
    () => document.getAnimations().every(animation => animation.playState !== 'running'),
    undefined,
    {timeout: 20_000}
  );

  await page.waitForFunction(
    () => !document.fonts || document.fonts.status === 'loaded',
    undefined,
    {timeout: 20_000}
  );

  await page.waitForFunction(
    (scopeSelector: string) => {
      const isVisibleInViewport = (element: Element | null): boolean => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
          return false;
        }

        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return false;
        }

        return rect.bottom > 0
          && rect.right > 0
          && rect.top < window.innerHeight
          && rect.left < window.innerWidth;
      };

      const blockers = [
        ...document.querySelectorAll('.app-route-loading mat-progress-bar'),
        ...document.querySelectorAll('lib-auto-content-loading-indicator .skeleton'),
        ...document.querySelectorAll('lib-auto-update-loading-indicator app-lottie-container')
      ];

      return blockers.every((element) => !isVisibleInViewport(element));
    },
    undefined,
    {timeout: 20_000}
  );

  await page.waitForFunction(
    (scopeSelector: string) => {
      const isVisibleInViewport = (element: Element | null): boolean => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
          return false;
        }

        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return false;
        }

        return rect.bottom > 0
          && rect.right > 0
          && rect.top < window.innerHeight
          && rect.left < window.innerWidth;
      };

      const scopeRoot = document.querySelector(scopeSelector) ?? document.body;

      return Array.from(scopeRoot.querySelectorAll('img'))
        .filter((image) => isVisibleInViewport(image))
        .every((image) => image.complete && image.naturalWidth > 0);
    },
    readyScopeSelector,
    {timeout: 20_000}
  );

  await page.waitForFunction(
    async (selector: string) => {
      const target = document.querySelector(selector);
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const readBox = () => {
        const rect = target.getBoundingClientRect();
        return [
          Math.round(rect.x),
          Math.round(rect.y),
          Math.round(rect.width),
          Math.round(rect.height)
        ].join(':');
      };

      const first = readBox();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const second = readBox();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const third = readBox();

      return first === second && second === third;
    },
    focusSelector,
    {timeout: 10_000}
  );
}

async function prepareHome(page: Page): Promise<void> {
  const patchId = await getPublicConnectedPatchId();
  await page.goto('/home');
  await expect(page).toHaveURL(/\/home/, {timeout: 20_000});
  await expect(page.locator('div.home-page h1').first()).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('link', {name: /sign up/i}).first()).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('link', {name: /log in/i}).first()).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('link', {name: /my profile/i})).toHaveCount(0);
  await setHomeHeroPatch(page, patchId);
  await expect(page.locator('app-home-experience-hero .patch-graph-shell app-patch-graph').first()).toBeVisible({
    timeout: 20_000
  });
  await revealHomeHeroGraph(page);
}

async function prepareModuleBrowser(page: Page): Promise<void> {
  await page.goto('/modules/browser');
  await expect(page).toHaveURL(/\/modules\/browser/, {timeout: 20_000});
  await waitForVisibleCardCount(page, 'app-module-minimal', 6, 'module cards');
}

async function prepareModuleDetails(page: Page): Promise<void> {
  await page.goto('/modules/details/1025');
  await expect(page).toHaveURL(/\/modules\/details\/1025/, {timeout: 20_000});
  await expect(page.getByRole('heading', {name: /module details/i})).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('heading', {name: /Racked in|Patched in|Data|Search on/i}).first()).toBeVisible({
    timeout: 20_000
  });
}

async function preparePatchBrowser(page: Page): Promise<void> {
  await page.goto('/patches/browser');
  await expect(page).toHaveURL(/\/patches\/browser/, {timeout: 20_000});
  await waitForVisibleCardCount(page, 'app-patch-micro', 6, 'patch cards');
}

async function preparePatchDetailsEditing(page: Page): Promise<void> {
  try {
    await openBestOwnedPatchDetailsInEditMode(page);
  } catch (error) {
    if (error instanceof BlockedScreenshotError) {
      throw error;
    }
    throw error;
  }
}

async function prepareRackBrowser(page: Page): Promise<void> {
  await page.goto('/racks/browser');
  await expect(page).toHaveURL(/\/racks\/browser/, {timeout: 20_000});
  await waitForVisibleCardCount(page, 'app-rack-list app-rack-micro', 6, 'rack cards');
}

async function prepareUserArea(page: Page): Promise<void> {
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
  await expect(page.locator('app-user-area-root').first()).toBeVisible({timeout: 20_000});
  await expect(page.locator('.user-area-utility-search input').first()).toBeVisible({
    timeout: 20_000
  });
  await expect(page.locator('app-user-modules, app-user-racks, app-user-patches').first()).toBeVisible({timeout: 20_000});
}

async function waitForVisibleCardCount(page: Page, selector: string, minimumCount: number, label: string): Promise<void> {
  await expect.poll(
    () => countVisibleElements(page, selector),
    {
      message: `Expected at least ${ minimumCount } visible ${ label }`,
      timeout: 20_000
    }
  ).toBeGreaterThanOrEqual(minimumCount);
}

async function countVisibleElements(page: Page, selector: string): Promise<number> {
  return page.evaluate((selectorText: string) => {
    const isVisible = (element: Element): boolean => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      if (element.closest('[data-docs-screenshot-hide="true"]')) {
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

    return Array.from(document.querySelectorAll(selectorText)).filter(isVisible).length;
  }, selector);
}

async function validateMinimumVisibleCards(
  page: Page,
  selector: string,
  minimumCount: number,
  label: string
): Promise<void> {
  const count = await countVisibleElements(page, selector);
  if (count < minimumCount) {
    throw new BlockedScreenshotError(
      `Only ${ count } non-fixture ${ label } remain visible after docs screenshot sanitisation; minimum required is ${ minimumCount }.`
    );
  }
}

async function validatePatchDetails(page: Page): Promise<void> {
  await expect(page.locator('app-patch-composite').first()).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('heading', {name: /Patch editing/i}).first()).toBeVisible({timeout: 20_000});
  await expect(page.locator('text=/\\[E2E\\]/i')).toHaveCount(0);
}

async function validateUserArea(page: Page): Promise<void> {
  const counts = {
    modules: await countVisibleElements(page, 'app-user-modules app-module-minimal'),
    racks: await countVisibleElements(page, 'app-user-racks app-rack-micro'),
    patches: await countVisibleElements(page, 'app-user-patches app-patch-micro')
  };
  const emptySections = Object.entries(counts)
    .filter(([, count]) => count < 1)
    .map(([section]) => section);

  if (emptySections.length) {
    throw new BlockedScreenshotError(
      `User area docs screenshot blocked after sanitisation; empty non-fixture sections: ${ emptySections.join(', ') }.`
    );
  }

  await expect(page.getByRole('heading', {name: /USER AREA — Docs account/i}).first()).toBeVisible({timeout: 10_000});
  await expect(page.locator('text=/\\[E2E\\]/i')).toHaveCount(0);
}

async function prepareAccount(page: Page): Promise<void> {
  await page.goto('/user/account');
  await expect(page).toHaveURL(/\/user\/account/, {timeout: 20_000});
  await expect(page.locator('app-user-management .account-shell').first()).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('heading', {name: /Account management/i}).first()).toBeVisible({timeout: 20_000});
}

async function preparePublicProfile(page: Page): Promise<void> {
  await page.goto('/u/Polyterative');
  await expect(page).toHaveURL(/\/u\/Polyterative/, {timeout: 20_000});
  await expect(page.locator('app-public-profile .public-profile-page').first()).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('heading', {name: /Public profile/i}).first()).toBeVisible({timeout: 20_000});
}

async function prepareRackDetailsCentered(page: Page): Promise<void> {
  await page.goto('/racks/tmS5m7-YosQr');
  await expect(page).toHaveURL(/\/racks\/tmS5m7-YosQr/, {timeout: 20_000});
  await expect(page.getByRole('heading', {name: /Rack details/i}).first()).toBeVisible({timeout: 20_000});
  await expect(page.locator('app-rack-composite').first()).toBeVisible({timeout: 20_000});
  await centerElementOnViewport(page, 'app-rack-composite');
}

export const SCREENSHOT_TARGETS: ScreenshotTarget[] = [
  {
    fileName: '01-home.jpg',
    prepare: prepareHome,
    focusSelector: 'app-home-experience-hero .hero-shell',
    readyScopeSelector: 'app-home-experience-hero',
    settleDelayMs: 1_500,
    authenticated: false
  },
  {
    fileName: '02-modules.jpg',
    prepare: prepareModuleBrowser,
    focusSelector: 'app-module-minimal',
    readyScopeSelector: 'app-module-list',
    settleDelayMs: 800,
    validateAfterSanitisation: page => validateMinimumVisibleCards(page, 'app-module-minimal', 6, 'module cards')
  },
  {
    fileName: '03-module-details.jpg',
    prepare: prepareModuleDetails,
    focusSelector: 'app-module-browser-detail .module-detail-layout',
    readyScopeSelector: 'app-module-browser-detail .module-detail-layout',
    settleDelayMs: 1_500
  },
  {
    fileName: '04-patches.jpg',
    prepare: preparePatchBrowser,
    focusSelector: 'app-patch-micro',
    settleDelayMs: 800,
    validateAfterSanitisation: page => validateMinimumVisibleCards(page, 'app-patch-micro', 6, 'patch cards')
  },
  {
    fileName: '05-patch-details.jpg',
    prepare: preparePatchDetailsEditing,
    focusSelector: 'app-patch-composite',
    validateAfterSanitisation: validatePatchDetails
  },
  {
    fileName: '06-racks.jpg',
    prepare: prepareRackBrowser,
    focusSelector: 'app-rack-micro',
    readyScopeSelector: 'app-rack-list',
    settleDelayMs: 800,
    validateAfterSanitisation: page => validateMinimumVisibleCards(page, 'app-rack-list app-rack-micro', 6, 'rack cards')
  },
  {fileName: '07-rack-details.jpg', prepare: prepareRackDetailsCentered, focusSelector: 'app-rack-composite'},
  {
    fileName: '08-user-area.jpg',
    prepare: prepareUserArea,
    focusSelector: 'app-user-area-root',
    settleDelayMs: 1_500,
    validateAfterSanitisation: validateUserArea
  },
  {fileName: '09-account.jpg', prepare: prepareAccount, focusSelector: 'app-user-management .account-shell', settleDelayMs: 1_500},
  {
    fileName: '10-public-profile.jpg',
    prepare: preparePublicProfile,
    focusSelector: 'app-public-profile .public-profile-page',
    settleDelayMs: 1_500,
    authenticated: false
  }
];

test.describe('Major area screenshot automation', () => {
  test.use({viewport: DESKTOP_VIEWPORT});
  
  for (const target of SCREENSHOT_TARGETS) {
    test(`captures ${ target.fileName }`, async ({page, browser, baseURL}) => {
      ensureOutputDir();
      let detachedContext: BrowserContext | undefined;
      let capturePage = page;

      if (target.authenticated === false) {
        detachedContext = await browser.newContext({
          viewport: DESKTOP_VIEWPORT,
          baseURL: baseURL ?? 'http://localhost:5556',
          reducedMotion: 'reduce',
          serviceWorkers: 'block',
          storageState: {
            cookies: [],
            origins: []
          }
        });
        capturePage = await detachedContext.newPage();
      }

      try {
        await installScreenshotMode(capturePage);
        await target.prepare(capturePage);
        await captureViewport(capturePage, target);
      } finally {
        await detachedContext?.close();
      }
    });
  }
});
