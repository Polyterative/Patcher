import fs from 'node:fs';
import path from 'node:path';
import {
  expect,
  type BrowserContext,
  type Page,
  test
} from '@playwright/test';
import {
  openOwnedPatchDetailsInEditMode,
  openOwnedRackDetailsInEditMode
} from '../helpers/user-owned-entities';


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
  await page.evaluate((resolvedPatchId: number) => {
    const ng = (window as {ng?: {getComponent?: (element: Element) => any}}).ng;
    if (!ng?.getComponent) {
      throw new Error('Angular debug API unavailable');
    }

    const homeRoot = document.querySelector('app-home');
    if (!homeRoot) {
      throw new Error('Home component not found');
    }

    const component = ng.getComponent(homeRoot);
    component.patchDetailDataService.updateSinglePatchData$.next(resolvedPatchId);
  }, patchId);
}

async function revealHomeHeroGraph(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const ng = (window as {ng?: {getComponent?: (element: Element) => any}}).ng;
      const patchGraphHost = document.querySelector('app-home-experience-hero .patch-graph-shell app-patch-graph');
      const graphHost = document.querySelector('app-home-experience-hero .patch-graph-shell lib-graph');
      if (!ng?.getComponent || !patchGraphHost || !graphHost) {
        return false;
      }

      const patchGraphComponent = ng.getComponent(patchGraphHost);
      const graphComponent = ng.getComponent(graphHost);
      const hasGraphData = (patchGraphComponent?.nodes$?.value?.length ?? 0) > 0;
      if (!hasGraphData || !graphComponent) {
        return false;
      }

      graphComponent.loaded = true;
      graphComponent.cd?.detectChanges?.();
      graphComponent.renderer?.resize?.();
      graphComponent.renderer?.refresh?.();

      const invisibleContainer = graphHost.querySelector('.invisible');
      if (invisibleContainer instanceof HTMLElement) {
        invisibleContainer.classList.remove('invisible');
      }

      return !graphHost.textContent?.includes('Graph loading...');
    },
    undefined,
    {timeout: 20_000}
  );
}

async function captureViewport(
  page: Page,
  fileName: string,
  focusSelector: string,
  readyScopeSelector = focusSelector,
  settleDelayMs = SCREENSHOT_DELAY_MS
): Promise<void> {
  await waitForScreenshotReady(page, focusSelector, readyScopeSelector);
  await page.waitForTimeout(settleDelayMs);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, fileName),
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
  await expect(page.locator('main.home-page h1').first()).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('link', {name: /sign up/i}).first()).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('link', {name: /log in/i}).first()).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('link', {name: /my profile/i})).toHaveCount(0);
  await setHomeHeroPatch(page, patchId);
  await expect(page.locator('app-home-experience-hero .patch-graph-shell lib-graph').first()).toBeVisible({timeout: 20_000});
  await revealHomeHeroGraph(page);
}

async function prepareModuleBrowser(page: Page): Promise<void> {
  await page.goto('/modules/browser');
  await expect(page).toHaveURL(/\/modules\/browser/, {timeout: 20_000});
  await expect(page.getByRole('status').first()).toBeVisible({timeout: 20_000});
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
  await expect(page.getByRole('status').first()).toBeVisible({timeout: 20_000});
}

async function preparePatchDetailsEditing(page: Page): Promise<void> {
  await openOwnedPatchDetailsInEditMode(page);
}

async function prepareRackBrowser(page: Page): Promise<void> {
  await page.goto('/racks/browser');
  await expect(page).toHaveURL(/\/racks\/browser/, {timeout: 20_000});
  await expect(page.locator('app-rack-micro, app-empty-state').first()).toBeVisible({timeout: 20_000});
}

async function prepareUserArea(page: Page): Promise<void> {
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
  await expect(page.locator('app-user-area-root').first()).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('textbox', {name: /search modules, racks, patches/i}).first()).toBeVisible({
    timeout: 20_000
  });
  await expect(page.locator('app-user-modules, app-user-racks, app-user-patches').first()).toBeVisible({timeout: 20_000});
}

async function prepareRackDetailsEditingCentered(page: Page): Promise<void> {
  await openOwnedRackDetailsInEditMode(page);
  await centerElementOnViewport(page, 'app-rack-composite');
}

const SCREENSHOT_TARGETS: ScreenshotTarget[] = [
  {
    fileName: '01-home.jpg',
    prepare: prepareHome,
    focusSelector: 'app-home-experience-hero .patch-graph-shell lib-graph',
    settleDelayMs: 15_000,
    authenticated: false
  },
  {fileName: '02-modules.jpg', prepare: prepareModuleBrowser, focusSelector: 'app-module-minimal, app-empty-state'},
  {
    fileName: '03-module-details.jpg',
    prepare: prepareModuleDetails,
    focusSelector: 'app-module-browser-detail .module-detail-layout',
    readyScopeSelector: 'app-module-browser-detail .module-detail-layout',
    settleDelayMs: 1_500
  },
  {fileName: '04-patches.jpg', prepare: preparePatchBrowser, focusSelector: 'app-patch-micro, app-empty-state'},
  {fileName: '05-patch-details.jpg', prepare: preparePatchDetailsEditing, focusSelector: 'app-patch-composite'},
  {
    fileName: '06-racks.jpg',
    prepare: prepareRackBrowser,
    focusSelector: 'app-rack-micro, app-empty-state',
    readyScopeSelector: 'app-rack-list'
  },
  {fileName: '07-rack-details.jpg', prepare: prepareRackDetailsEditingCentered, focusSelector: 'app-rack-composite'},
  {fileName: '08-user-area.jpg', prepare: prepareUserArea, focusSelector: 'app-user-area-root', settleDelayMs: 1_500}
];

test.describe('Major area screenshot automation', () => {
  test.use({viewport: DESKTOP_VIEWPORT});
  test.describe.configure({mode: 'parallel'});
  
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
        await captureViewport(
          capturePage,
          target.fileName,
          target.focusSelector,
          target.readyScopeSelector,
          target.settleDelayMs
        );
      } finally {
        await detachedContext?.close();
      }
    });
  }
});
