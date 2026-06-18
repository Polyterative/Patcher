import fs from 'node:fs';
import path from 'node:path';
import {
  chromium,
  expect,
  type Page
} from '@playwright/test';

export const AUTH_STORAGE_STATE_PATH = path.resolve(process.cwd(), 'playwright/.auth/user.json');

const E2E_ENV_PATH = path.resolve(process.cwd(), '.env');

export interface E2EAuthCredentials {
  email: string;
  password: string;
}

export function loadE2EEnvFromDotEnv(): void {
  if (!fs.existsSync(E2E_ENV_PATH)) {
    return;
  }

  for (const line of fs.readFileSync(E2E_ENV_PATH, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w]+)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const value = match[2].replace(/^['"]|['"]$/g, '').trim();
    if (value) {
      process.env[match[1]] ??= value;
    }
  }
}

export function hasE2EAuthCredentials(): boolean {
  return Boolean(process.env['E2E_TEST_EMAIL']?.trim()) && Boolean(process.env['E2E_TEST_PASSWORD']?.trim());
}

export function getE2EAuthCredentialsOrThrow(): E2EAuthCredentials {
  const email = process.env['E2E_TEST_EMAIL']?.trim();
  const password = process.env['E2E_TEST_PASSWORD']?.trim();

  if (!email || !password) {
    throw new Error(
      '[e2e-auth] Missing E2E_TEST_EMAIL or E2E_TEST_PASSWORD. Set them in environment variables or in .env.'
    );
  }

  return {
    email,
    password
  };
}

async function loginWithCredentials(page: Page, credentials: E2EAuthCredentials, baseURL: string): Promise<void> {
  const sanitizedBaseURL = baseURL.replace(/\/$/, '');

  await page.goto(`${ sanitizedBaseURL }/auth/login`);
  await page.waitForLoadState('networkidle');
  const loginInputs = page.locator('app-login-email input');
  const loginButton = page.locator('app-login-email a.brand-button').first();

  await loginInputs.first().fill(credentials.email);
  await loginInputs.nth(1).fill(credentials.password);
  await page.locator('vite-error-overlay').waitFor({state: 'hidden', timeout: 5_000}).catch(() => undefined);
  await loginButton.click({force: true});

  await page.waitForURL(url => /\/user\/area/.test(url.pathname) || /\/auth\/complete-profile/.test(url.pathname), {
    timeout: 30_000
  });

  if (/\/auth\/complete-profile/.test(page.url())) {
    await completeProfile(page, credentials.email);
    await page.waitForURL(/\/user\/area/, {timeout: 30_000});
  }

  await expect(page).toHaveURL(/\/user\/area/, {timeout: 30_000});
  await page.waitForLoadState('networkidle');
  await expect(page.locator('app-user-area-root').first()).toBeVisible({timeout: 20_000});
}

async function completeProfile(page: Page, email: string): Promise<void> {
  const username = buildE2EUsername(email);
  const usernameInput = page.locator('app-complete-profile input').first();
  const submitButton = page.locator('app-complete-profile app-brand-primary-button a.brand-button:not(.disabled):not([disabled])').first();

  await expect(usernameInput).toBeVisible({timeout: 20_000});
  await usernameInput.fill(username);
  await expect(submitButton).toBeVisible({timeout: 10_000});
  await submitButton.click({force: true});
}

function buildE2EUsername(email: string): string {
  return email
    .split('@')[0]
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 30);
}

export async function loginAndSaveStorageState(baseURL: string, storageStatePath = AUTH_STORAGE_STATE_PATH): Promise<void> {
  const credentials = getE2EAuthCredentialsOrThrow();

  fs.mkdirSync(path.dirname(storageStatePath), {recursive: true});
  const storageStateTempPath = `${ storageStatePath }.${ process.pid }.tmp`;

  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginWithCredentials(page, credentials, baseURL);
    const storageState = await context.storageState();
    fs.writeFileSync(storageStateTempPath, `${ JSON.stringify(storageState, null, 2) }\n`);
    fs.renameSync(storageStateTempPath, storageStatePath);
  } finally {
    fs.rmSync(storageStateTempPath, {force: true});
    await context.close();
    await browser.close();
  }
}
