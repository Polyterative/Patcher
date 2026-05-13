const { chromium } = require('./node_modules/.pnpm/playwright@1.58.2/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5556/modules/add', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.stepper', { timeout: 15000 });
  await p.waitForTimeout(800);
  await p.locator('text=Got it').first().click({ force: true });
  await p.waitForTimeout(600);
  // Trigger celebration through Angular's debug element
  await p.evaluate(() => {
    const host = document.querySelector('app-module-browser-adder');
    // @ts-ignore
    const ng = window.ng;
    if (!ng || !host) { console.warn('no ng'); return; }
    const cmp = ng.getComponent(host);
    cmp.celebration$.next({ name: 'Maths' });
    cmp.dataService && cmp.dataService.submitSuccess$ && (() => {})();
    // force change detection
    const appRef = ng.getInjector(host).get(ng.ApplicationRef || function(){});
    try { ng.applyChanges && ng.applyChanges(cmp); } catch(e){}
  });
  await p.waitForTimeout(800);
  await p.screenshot({ path: '/tmp/celeb-real-mid.png', fullPage: false });
  await p.waitForTimeout(700);
  await p.screenshot({ path: '/tmp/celeb-real-end.png', fullPage: false });
  await ctx.close();
  await browser.close();
  console.log('done');
})();
