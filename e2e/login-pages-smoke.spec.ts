import {expect, test} from '@playwright/test';

test.describe('Login page — form element smoke tests', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');
  });

  test('page loads with correct title', async ({page}) => {
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('lib-hero-content-card.auth-entry-card')).toBeVisible();
  });

  test('email/password form inputs are rendered', async ({page}) => {
    // lib-mat-form-entity renders Material form fields with <input> inside
    const inputs = page.locator('mat-form-field input');
    await expect(inputs).toHaveCount(2);
  });

  test('login submit button is rendered', async ({page}) => {
    const loginBtn = page.locator('app-brand-primary-button.auth-submit-button');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toContainText('Log in');
  });

  test('sign-up navigation link is visible', async ({page}) => {
    const signupLink = page.locator('.signup-link');
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toContainText('Sign up');
  });

  test('"Forgot your password?" link is visible', async ({page}) => {
    const resetLink = page.locator('.reset-link');
    await expect(resetLink).toBeVisible();
    await expect(resetLink).toContainText('Forgot your password?');
  });

  test('email section has correct aria-label', async ({page}) => {
    const section = page.locator('section[aria-label="Email login"]');
    await expect(section).toBeVisible();
  });
});

test.describe('Signup page — form element smoke tests', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('domcontentloaded');
  });

  test('page loads with correct title', async ({page}) => {
    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(page.locator('lib-hero-content-card.auth-entry-card')).toBeVisible();
  });

  test('signup form inputs are rendered (username, email, password, confirm)', async ({page}) => {
    const inputs = page.locator('mat-form-field input');
    await expect(inputs).toHaveCount(4);
  });

  test('sign-up submit button is rendered', async ({page}) => {
    const signupBtn = page.locator('app-brand-primary-button.auth-submit-button');
    await expect(signupBtn).toBeVisible();
    await expect(signupBtn).toContainText('Sign up');
  });

  test('login navigation link is visible', async ({page}) => {
    const loginLink = page.locator('.login-link');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toContainText('Log in');
  });

  test('email signup section has correct aria-label', async ({page}) => {
    const section = page.locator('section[aria-label="Email signup"]');
    await expect(section).toBeVisible();
  });
});

test.describe('Cross-page auth navigation', () => {
  test('clicking sign-up link from login navigates to /auth/signup', async ({page}) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.signup-link').click();
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('clicking log-in link from signup navigates to /auth/login', async ({page}) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.login-link').click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
