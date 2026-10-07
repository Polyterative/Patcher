#!/usr/bin/env node
// Runtime dark-mode audit. Loads routes with html.dark and reports:
//   LIGHT  elements painting a light background (solid or gradient) in dark mode
//   LOWC   text whose contrast against its effective background is < 3:1
// Usage: node scripts/dev/dark-audit.mjs [--base http://localhost:5556] [--routes /a,/b] [--shots dir]
// Needs the dev server running. Exits 1 when findings exist (use for CI / pre-release).
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const BASE = arg('base', 'http://localhost:5556');
const SHOTS = arg('shots', '');
const DEFAULT_ROUTES = [
  '/', '/modules', '/racks', '/patches', '/manufacturers', '/marketplace', '/collections',
  '/modules/browser', '/racks/browser', '/patches/browser', '/manufacturers/browser', '/info/insights', '/info/changelog', '/info/about', '/auth/login', '/auth/signup', '/auth/reset-password', '/404'
];
const routes = arg('routes', '') ? arg('routes').split(',') : DEFAULT_ROUTES;

// Runs in the page. Returns offending elements (deduped by selector path).
const scan = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (top, bottom) => {
    const a = top.a + bottom.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    const mix = (t, b) => (t * top.a + b * bottom.a * (1 - top.a)) / a;
    return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
  };
  const contrast = (x, y) => {
    const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
    return (hi + 0.05) / (lo + 0.05);
  };
  const root = parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 12, g: 17, b: 23, a: 1 };
  const bodyBg = parse(getComputedStyle(document.body).backgroundColor);
  const base = bodyBg && bodyBg.a > 0.9 ? bodyBg : { ...root, a: 1 };

  const gradientLight = (img) => {
    if (!img || !img.includes('gradient')) return false;
    const stops = [...img.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter((c) => c && c.a >= 0.5);
    return stops.length > 0 && stops.every((c) => lum(c) > 0.6);
  };
  const effectiveBg = (el) => {
    const chain = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) chain.push(n);
    let acc = base;
    for (const n of chain.reverse()) {
      const cs = getComputedStyle(n);
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) acc = over(c, acc);
      if (gradientLight(cs.backgroundImage)) acc = { r: 245, g: 248, b: 252, a: 1 };
    }
    return acc;
  };
  const path = (el) => {
    const parts = [];
    for (let n = el; n && n !== document.body && parts.length < 4; n = n.parentElement) {
      const cls = [...n.classList].filter((c) => !c.startsWith('ng-') && !c.startsWith('mat-mdc-') && !c.startsWith('cdk-')).slice(0, 2).join('.');
      parts.unshift(n.tagName.toLowerCase() + (cls ? '.' + cls : ''));
    }
    return parts.join(' > ');
  };
  const out = new Map();
  const add = (kind, el, detail) => {
    const k = kind + path(el);
    if (!out.has(k)) out.set(k, { kind, path: path(el), detail });
  };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 12) continue;
    if (['IMG', 'SVG', 'CANVAS', 'VIDEO', 'PICTURE'].includes(el.tagName.toUpperCase()) || el.closest('svg, img, canvas')) continue;
    const own = c => parse(c);
    const bg = own(cs.backgroundColor);
    if (bg && bg.a >= 0.5 && lum(bg) > 0.6) add('LIGHT', el, cs.backgroundColor);
    else if (gradientLight(cs.backgroundImage)) add('LIGHT', el, 'gradient');
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (hasText) {
      const fg = parse(cs.color);
      if (fg) {
        const bgEff = effectiveBg(el);
        const c = contrast(over(fg, bgEff), bgEff);
        if (c < 3) add('LOWC', el, `${c.toFixed(1)}:1 ${cs.color} on rgb(${[bgEff.r, bgEff.g, bgEff.b].map(Math.round)})`);
      }
    }
  }
  return [...out.values()];
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
await ctx.addInitScript(() => {
  try { localStorage.setItem('theme', 'dark'); } catch { /* ignore */ }
});
const page = await ctx.newPage();
let total = 0;
const report = async (label) => {
  const res = await page.evaluate(scan);
  total += res.length;
  console.log(`\n## ${label} — ${res.length} finding(s)`);
  for (const f of res) console.log(`  ${f.kind}  ${f.path}  [${f.detail}]`);
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: `${SHOTS}/${label.replace(/[^a-z0-9]+/gi, '_')}.png`, fullPage: false });
  }
};
const settle = async () => {
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(2500);
};

// Panel zoom dialog (module details) — only when the page has panel previews.
const tryZoom = async (label) => {
  const zoom = page.locator('.panel-preview-item').first();
  if (!(await zoom.count())) return;
  await zoom.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
  if (await page.locator('.mat-mdc-dialog-container').count()) await report(`${label} (zoom dialog)`);
  await page.keyboard.press('Escape');
};

const detailLinks = new Set();
for (const route of routes) {
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle();
    await report(route);
    await tryZoom(route);
    if (!process.argv.includes('--no-detail')) {
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
      for (const h of hrefs) {
        if (/^\/(modules|racks|patches|manufacturers|collections?)\/(details\/)?[^/?#]+$/.test(h || '') && !/\/(browser|add|new|manage|editor)$/.test(h)) detailLinks.add(h);
      }
    }
  } catch (e) {
    console.log(`\n## ${route} — ERROR ${e.message.split('\n')[0]}`);
  }
}
const perKind = new Map();
for (const h of detailLinks) {
  const k = h.split('/')[1];
  perKind.set(k, (perKind.get(k) || 0) + 1);
  if (perKind.get(k) > 2) continue;
  try {
    await page.goto(BASE + h, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle();
    await report(h);
    await tryZoom(h);
  } catch (e) {
    console.log(`\n## ${h} — ERROR ${e.message.split('\n')[0]}`);
  }
}
await browser.close();
console.log(`\ndark-audit: ${total} finding(s) across ${routes.length + perKind.size} page(s).`);
process.exit(total ? 1 : 0);
