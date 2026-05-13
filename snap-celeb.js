const { chromium } = require('./node_modules/.pnpm/playwright@1.58.2/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5556/modules/add', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.stepper', { timeout: 15000 });
  await p.waitForTimeout(800);
  // advance to fill
  await p.locator('text=Got it').first().click({ force: true });
  await p.waitForTimeout(600);
  // inject a celebration overlay manually by triggering the BehaviorSubject through DOM:
  // we can just inject the overlay HTML by evaluating the component template — simpler: dispatch event by setting via Angular zone.
  // fallback: append our own overlay markup that mirrors the structure to confirm CSS
  await p.evaluate(() => {
    const overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';
    overlay.innerHTML = `
      <div class="celebration-stage">
        <div class="celebration-ring">
          <svg class="celebration-ring-svg" viewBox="0 0 80 80" aria-hidden="true">
            <circle class="celebration-ring-track" cx="40" cy="40" r="34"></circle>
            <circle class="celebration-ring-progress" cx="40" cy="40" r="34"></circle>
            <path class="celebration-check" d="M25 41 L36 52 L56 30" fill="none"></path>
          </svg>
          ${[...Array(12)].map((_,i)=>`<span class="celebration-spark" style="--i:${i}"></span>`).join('')}
        </div>
        <div class="celebration-text">
          <p class="celebration-eyebrow">Submitted</p>
          <h2 class="celebration-title">"Maths" is live</h2>
          <p class="celebration-sub">Taking you to the module browser…</p>
        </div>
      </div>`;
    // attach to the adder-root so component-scoped styles apply
    const host = document.querySelector('.adder-root') || document.body;
    host.appendChild(overlay);
  });
  await p.waitForTimeout(900);
  await p.screenshot({ path: '/tmp/celeb-mid.png', fullPage: false });
  await p.waitForTimeout(700);
  await p.screenshot({ path: '/tmp/celeb-end.png', fullPage: false });
  await ctx.close();
  await browser.close();
  console.log('done');
})();
