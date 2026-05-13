const { chromium } = require('./node_modules/.pnpm/playwright@1.58.2/node_modules/playwright');

const URL = 'http://localhost:5556/modules/add';
const breakpoints = [
  { name: 'xs-360',  w: 360,  h: 800 },
  { name: 'sm-600',  w: 600,  h: 900 },
  { name: 'md-960',  w: 960,  h: 900 },
  { name: 'md-1280', w: 1280, h: 900 },
  { name: 'lg-1600', w: 1600, h: 1000 },
  { name: 'xl-1920', w: 1920, h: 1080 },
];

(async () => {
  const browser = await chromium.launch();
  for (const bp of breakpoints) {
    const context = await browser.newContext({ viewport: { width: bp.w, height: bp.h } });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `/tmp/add-${bp.name}-step1.png`, fullPage: true });

    // Acknowledge guidelines
    const ackBtn = page.locator('text=I\'ve read the guidelines').first();
    if (await ackBtn.count() > 0) {
      await ackBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `/tmp/add-${bp.name}-step2.png`, fullPage: true });
    }
    await context.close();
  }
  await browser.close();
  console.log('done');
})();
