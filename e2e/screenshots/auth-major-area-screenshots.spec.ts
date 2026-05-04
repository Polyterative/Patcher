import fs from 'node:fs';
import path from 'node:path';
import {
  expect,
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
const SCREENSHOT_DELAY_MS = 350;

interface ScreenshotTarget {
  fileName: string;
  prepare: (page: Page) => Promise<void>;
  settleDelayMs?: number;
}

function ensureOutputDir(): void {
  fs.mkdirSync(OUTPUT_DIR, {recursive: true});
}

async function captureViewport(page: Page, fileName: string, settleDelayMs = SCREENSHOT_DELAY_MS): Promise<void> {
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

async function prepareHome(page: Page): Promise<void> {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/home/, {timeout: 20_000});
  await expect(page.locator('main.home-page h1').first()).toBeVisible({timeout: 20_000});
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
}

async function prepareRackDetailsEditingCentered(page: Page): Promise<void> {
  await openOwnedRackDetailsInEditMode(page);
  await centerElementOnViewport(page, 'app-rack-composite');
}

const SCREENSHOT_TARGETS: ScreenshotTarget[] = [
  {fileName: '01-home.jpg', prepare: prepareHome},
  {fileName: '02-modules.jpg', prepare: prepareModuleBrowser},
  {fileName: '03-module-details.jpg', prepare: prepareModuleDetails},
  {fileName: '04-patches.jpg', prepare: preparePatchBrowser},
  {fileName: '05-patch-details.jpg', prepare: preparePatchDetailsEditing},
  {fileName: '06-racks.jpg', prepare: prepareRackBrowser, settleDelayMs: 5_000},
  {fileName: '07-rack-details.jpg', prepare: prepareRackDetailsEditingCentered, settleDelayMs: 5_000},
  {fileName: '08-user-area.jpg', prepare: prepareUserArea, settleDelayMs: 2_500}
];

test.describe('Major area screenshot automation', () => {
  test.use({viewport: DESKTOP_VIEWPORT});
  test.describe.configure({mode: 'parallel'});
  
  for (const target of SCREENSHOT_TARGETS) {
    test(`captures ${ target.fileName }`, async ({page}) => {
      ensureOutputDir();
      await target.prepare(page);
      await captureViewport(page, target.fileName, target.settleDelayMs);
    });
  }
});
