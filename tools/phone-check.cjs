// Phone layout check: no sideways scrolling on real phone sizes (mobile emulation, which is
// stricter than a narrow desktop window: the page must not widen its layout viewport).
// Usage: npm run serve (in another terminal), then: node tools/phone-check.cjs [base-url]
// Needs Playwright with Chromium installed.
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8000';
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const dev of ['iPhone SE', 'iPhone 13', 'Pixel 5', 'Galaxy S8']) {
    const ctx = await b.newContext({ ...devices[dev] }); const m = await ctx.newPage();
    const vw = devices[dev].viewport.width;
    for (const url of ['/', '/report/', '/report/?kind=warning']) {
      await m.goto(BASE + url); await m.waitForSelector(url === '/' ? '.card' : '#form:not([hidden])');
      for (const t of url === '/' ? ['model', 'app', 'host'] : [null]) {
        if (t) { await m.selectOption('#country', 'NG'); await m.click('#tab-' + t); const s = await m.$('.card summary'); if (s) await s.click(); }
        const r = await m.evaluate(() => ({ iw: innerWidth, sw: document.documentElement.scrollWidth }));
        const ok = r.iw === vw && r.sw === vw; if (!ok) bad++;
        console.log(`${dev.padEnd(9)} ${(url + (t ? ' ' + t : '')).padEnd(24)} ${ok ? 'ok' : `OVERFLOW: page is ${Math.max(r.iw, r.sw)}px wide on a ${vw}px screen`}`);
      }
    }
    await ctx.close();
  }
  await b.close();
  if (bad) { console.error(`${bad} layout(s) overflow`); process.exit(1); }
  console.log('No sideways scrolling on any phone.');
})();
