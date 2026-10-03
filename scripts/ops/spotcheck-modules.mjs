// Staging spot-check: screenshot module browser, count images by state.
import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const bad = [];
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().slice(0, 110));
  });
  await page.goto('http://localhost:5556/modules', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4000);
  const stats = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    let loaded = 0, broken = 0, empty = 0;
    for (const i of imgs) {
      if (!i.getAttribute('src')) empty++;
      else if (i.naturalWidth > 1) loaded++;
      else broken++;
    }
    const cards = document.querySelectorAll('[class*="card"], [class*="tile"], mat-card').length;
    return { imgs: imgs.length, loaded, broken, empty, cards, title: document.title };
  });
  console.log('IMG_STATS ' + JSON.stringify(stats));
  console.log('BAD_RESPONSES ' + bad.length);
  bad.slice(0, 10).forEach((b) => console.log('  ' + b));
  await page.screenshot({ path: 'backups/staging-modules-spotcheck.png' });
  console.log('saved backups/staging-modules-spotcheck.png');
  await browser.close();
})();
