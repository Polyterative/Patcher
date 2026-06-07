#!/usr/bin/env node
/**
 * Agent UI snapshot helper.
 *
 * Drives a headless Chromium against a running dev server and dumps:
 *   - <out>/screenshot.png      full-page screenshot
 *   - <out>/dom.html             rendered HTML snapshot
 *   - <out>/a11y.json            Playwright accessibility tree
 *   - <out>/console.log          captured browser console messages
 *   - <out>/requests.log         network requests + statuses
 *
 * The intent is to make UI behaviour legible to an agent without spinning up
 * a full Playwright spec. Use this when an agent persona (bug-hunter,
 * designer) needs to see what the running app actually looks like.
 *
 * Prereqs:
 *   - Dev server running on $BASE_URL (default http://localhost:5556).
 *   - chromium installed (`pnpm exec playwright install chromium` once).
 *
 * Usage:
 *   node scripts/agent-snapshot.mjs --route /modules --out tmp/snap
 *   node scripts/agent-snapshot.mjs --route /racks/123 --auth --out tmp/snap
 *
 * Flags:
 *   --route <path>   route under BASE_URL to capture (default "/")
 *   --out <dir>      output directory (default tmp/agent-snap)
 *   --auth           reuse Playwright stored auth state if available
 *   --wait <ms>      extra settle time after networkidle (default 500)
 *   --viewport WxH   viewport size (default 1440x900)
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
function flag(name, def) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const next = args[i + 1];
  if (!next || next.startsWith('--')) return true;
  return next;
}

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5556';
const route = flag('route', '/');
const outDir = path.resolve(flag('out', 'tmp/agent-snap'));
const useAuth = flag('auth', false) === true;
const settleMs = Number(flag('wait', 500));
const [vw, vh] = String(flag('viewport', '1440x900'))
  .split('x')
  .map((n) => Number(n));

fs.mkdirSync(outDir, { recursive: true });

const STORAGE_STATE = path.resolve('playwright/.auth/user.json');
const storageState =
  useAuth && fs.existsSync(STORAGE_STATE) ? STORAGE_STATE : undefined;

if (useAuth && !storageState) {
  console.warn(
    `[agent-snapshot] --auth requested but ${STORAGE_STATE} not found. Run pnpm test:e2e:auth once to generate it. Continuing unauthenticated.`
  );
}

const url = new URL(route, BASE_URL).toString();
console.log(`[agent-snapshot] ${url} → ${outDir}`);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: vw, height: vh },
  storageState
});
const page = await context.newPage();

const consoleLines = [];
page.on('console', (msg) => {
  consoleLines.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => {
  consoleLines.push(`[pageerror] ${err.message}`);
});

const requests = [];
page.on('response', async (resp) => {
  try {
    requests.push(`${resp.status()} ${resp.request().method()} ${resp.url()}`);
  } catch {
    /* ignore */
  }
});

const t0 = Date.now();
try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  if (settleMs > 0) await page.waitForTimeout(settleMs);
} catch (err) {
  consoleLines.push(`[goto] ${err.message}`);
}

await page.screenshot({
  path: path.join(outDir, 'screenshot.png'),
  fullPage: true
});

const html = await page.content();
fs.writeFileSync(path.join(outDir, 'dom.html'), html);

const a11y = await page.accessibility.snapshot({ interestingOnly: false });
fs.writeFileSync(path.join(outDir, 'a11y.json'), JSON.stringify(a11y, null, 2));

fs.writeFileSync(path.join(outDir, 'console.log'), consoleLines.join('\n'));
fs.writeFileSync(path.join(outDir, 'requests.log'), requests.join('\n'));

const meta = {
  url,
  viewport: { width: vw, height: vh },
  authenticated: Boolean(storageState),
  durationMs: Date.now() - t0,
  consoleCount: consoleLines.length,
  requestCount: requests.length,
  outDir
};
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));

await browser.close();

console.log(JSON.stringify(meta, null, 2));
