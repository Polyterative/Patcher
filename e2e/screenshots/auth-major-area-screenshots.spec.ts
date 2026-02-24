import fs from 'node:fs';
import path from 'node:path';
import {
  expect,
  type Page,
  test
} from '@playwright/test';


const OUTPUT_DIR = path.resolve(process.cwd(), 'src/assets/screenshots/major-area-screenshots');
const PREDICTABLE_PATCH_ID = Number(process.env['E2E_PREDICTABLE_PATCH_ID'] ?? '156');
const PREDICTABLE_RACK_ID = Number(process.env['E2E_PREDICTABLE_RACK_ID'] ?? '644');
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
  await expect(page.locator('div.card').first()).toBeVisible({timeout: 20_000});
}

async function prepareModuleDetails(page: Page): Promise<void> {
  await page.goto('/modules/details/1025');
  await expect(page).toHaveURL(/\/modules\/details\/1025/, {timeout: 20_000});
  await expect(page.getByRole('heading', {name: /module details/i})).toBeVisible({timeout: 20_000});
  await expect(page.locator('app-module-tags').first()).toBeVisible({timeout: 20_000});
}

async function preparePatchBrowser(page: Page): Promise<void> {
  await page.goto('/patches/browser');
  await expect(page).toHaveURL(/\/patches\/browser/, {timeout: 20_000});
  await expect(page.locator('div.card').first()).toBeVisible({timeout: 20_000});
}

async function isPatchEditingModeVisible(page: Page): Promise<boolean> {
  const patchEditingHeading = page.getByRole('heading', {name: /patch editing/i}).first();
  if (await patchEditingHeading.isVisible().catch(() => false)) {
    return true;
  }
  
  return page.getByRole('button', {name: /close editor/i}).first().isVisible().catch(() => false);
}

async function tryEnablePatchEditingMode(page: Page): Promise<boolean> {
  if (await isPatchEditingModeVisible(page)) {
    return true;
  }
  
  const editFab = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();
  const canEdit = await editFab.isVisible().catch(() => false);
  
  if (!canEdit) {
    return false;
  }
  
  await editFab.click();
  await expect(page.getByRole('heading', {name: /patch editing/i}).first()).toBeVisible({timeout: 20_000});
  return true;
}

async function openPatchDetails(page: Page, patchId: number): Promise<boolean> {
  await page.goto(`/patches/details/${ patchId }`);
  const onExpectedRoute = await page.waitForURL(new RegExp(`/patches/details/${ patchId }`), {timeout: 8_000})
    .then(() => true)
    .catch(() => false);
  if (!onExpectedRoute) {
    return false;
  }
  
  return page.locator('app-patch-composite').first().waitFor({state: 'visible', timeout: 8_000})
    .then(() => true)
    .catch(() => false);
}

async function preparePatchDetailsEditing(page: Page): Promise<void> {
  const openedPredictablePatch = await openPatchDetails(page, PREDICTABLE_PATCH_ID);
  if (openedPredictablePatch && (await tryEnablePatchEditingMode(page))) {
    return;
  }
  
  throw new Error(
    `Predictable patch #${ PREDICTABLE_PATCH_ID } is not available in editable mode for this account. ` +
    `Prepare that patch and ensure /patches/details/${ PREDICTABLE_PATCH_ID } supports edit mode.`
  );
}

async function prepareRackBrowser(page: Page): Promise<void> {
  await page.goto('/racks/browser');
  await expect(page).toHaveURL(/\/racks\/browser/, {timeout: 20_000});
  await expect(page.locator('app-rack-micro').first()).toBeVisible({timeout: 20_000});
}

async function prepareUserArea(page: Page): Promise<void> {
  await page.goto('/user/area');
  await expect(page).toHaveURL(/\/user\/area/, {timeout: 20_000});
  await expect(page.locator('app-user-area-root').first()).toBeVisible({timeout: 20_000});
  await expect(page.getByRole('textbox', {name: /search modules, racks, patches/i}).first()).toBeVisible({
    timeout: 20_000
  });
}

async function isRackEditingModeVisible(page: Page): Promise<boolean> {
  return page.getByRole('heading', {name: /Rack Editing/i}).first().isVisible().catch(() => false);
}

async function tryEnableRackEditingMode(page: Page): Promise<boolean> {
  if (await isRackEditingModeVisible(page)) {
    return true;
  }
  
  const editRackButton = page.getByRole('button', {name: /^Edit rack$/i}).first();
  if (await editRackButton.isVisible().catch(() => false)) {
    await editRackButton.click();
    return page.getByRole('heading', {name: /Rack Editing/i}).first().isVisible().catch(() => false);
  }
  
  const editFabRackButton = page.locator('app-edit-fab button', {hasText: /^Edit rack$/i}).first();
  if (await editFabRackButton.isVisible().catch(() => false)) {
    await editFabRackButton.click();
    return page.getByRole('heading', {name: /Rack Editing/i}).first().isVisible().catch(() => false);
  }
  
  const genericEditFabButton = page.locator('app-edit-fab button', {hasText: /^Edit$/i}).first();
  if (await genericEditFabButton.isVisible().catch(() => false)) {
    await genericEditFabButton.click();
    return page.getByRole('heading', {name: /Rack Editing/i}).first().isVisible().catch(() => false);
  }
  
  return false;
}

async function openRackDetails(page: Page, rackId: number): Promise<boolean> {
  await page.goto(`/racks/details/${ rackId }`);
  const onExpectedRoute = await page.waitForURL(new RegExp(`/racks/details/${ rackId }`), {timeout: 8_000})
    .then(() => true)
    .catch(() => false);
  if (!onExpectedRoute) {
    return false;
  }
  
  return page.locator('app-rack-composite').first().waitFor({state: 'visible', timeout: 8_000})
    .then(() => true)
    .catch(() => false);
}

async function prepareRackDetailsEditingCentered(page: Page): Promise<void> {
  const openedPredictableRack = await openRackDetails(page, PREDICTABLE_RACK_ID);
  if (!openedPredictableRack) {
    throw new Error(
      `Predictable rack #${ PREDICTABLE_RACK_ID } is not renderable for screenshots. ` +
      `Prepare that rack and ensure /racks/details/${ PREDICTABLE_RACK_ID } shows full rack content.`
    );
  }
  
  const editableRack = await tryEnableRackEditingMode(page);
  if (!editableRack) {
    throw new Error(
      `Predictable rack #${ PREDICTABLE_RACK_ID } is not editable for screenshots. ` +
      `Prepare that rack and ensure /racks/details/${ PREDICTABLE_RACK_ID } supports edit mode.`
    );
  }
  
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