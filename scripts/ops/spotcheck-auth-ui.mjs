// Staging auth UI flow: login as throwaway (created via env-provided creds
// baked in at launch), verify session lands on account page, screenshot.
import { chromium } from '@playwright/test';
import fs from 'fs';

const [email, password] = [process.env.THROWAWAY_EMAIL, process.env.THROWAWAY_PASSWORD];
if (!email || !password) throw new Error('THROWAWAY_EMAIL/PASSWORD required');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const bad = [];
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().slice(0, 100));
  });
  await page.goto('http://localhost:5556/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const emailSel = 'input[type="email"], input[name*="mail" i], input[formcontrolname*="mail" i]';
  const passSel = 'input[type="password"]';
  await page.fill(emailSel, email);
  await page.fill(passSel, password);
  await page.screenshot({ path: 'backups/staging-login-filled.png' });
  await page.focus(passSel);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {}),
    page.keyboard.press('Enter'),
  ]);
  await page.waitForTimeout(4000);
  console.log('AFTER_LOGIN url=' + page.url());
  const session = await page.evaluate(() => localStorage.length + '/' + sessionStorage.length);
  console.log('storage_keys local/session=' + session);
  await page.goto('http://localhost:5556/user/account', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  console.log('ACCOUNT url=' + page.url());
  console.log('BAD_RESPONSES ' + bad.length);
  bad.slice(0, 10).forEach((b) => console.log('  ' + b));
  await page.screenshot({ path: 'backups/staging-account.png' });
  console.log('saved backups/staging-account.png');
  await browser.close();
})();
