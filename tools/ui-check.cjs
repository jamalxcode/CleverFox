// Page check before deploy: no sideways scrolling at phone widths, and colour contrast (axe-core, WCAG AA)
// in light and dark themes, on the main page, a listing, a guide, the glossary and New this week.
// Exits 1 on any problem, so the workflow stops the deploy.
// Usage: node tools/ui-check.cjs [--root .] [--axe <path to axe.min.js>]   (needs Playwright)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const root = path.resolve(arg('--root', '.'));
const axePath = arg('--axe', (() => { try { return require.resolve('axe-core/axe.min.js'); } catch { return null; } })());
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml' };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let f = path.join(root, p);
      if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const listing = fs.readdirSync(path.join(root, 'l', 'app')).map((p) => `l/app/${p}/${fs.readdirSync(path.join(root, 'l', 'app', p))[0]}/`)[0];
  const pages = ['', '#app', '#host', listing, 'guides/', 'guides/pay-without-a-card/', 'glossary/', 'new/'];
  const browser = await chromium.launch();
  const problems = [];
  // 1. Phone widths: nothing wider than the screen.
  for (const width of [320, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    for (const p of pages) {
      await page.goto(base + p, { waitUntil: 'networkidle' });
      await page.waitForTimeout(p.startsWith('#') || p === '' ? 1200 : 200);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 0) problems.push(`${width}px ${p || '/'}: ${over}px sideways scrolling`);
    }
    await page.close();
  }
  // 2. Contrast in light and dark (axe-core color-contrast, WCAG AA).
  if (!axePath) problems.push('axe-core not found: install it (npm i --no-save axe-core) or pass --axe');
  else {
    const axe = fs.readFileSync(axePath, 'utf8');
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, colorScheme: theme });
      // The site's own switch: light mode is stored in localStorage ("theme"); the dark Matrix look is the default.
      await ctx.addInitScript((t) => { try { localStorage.setItem('look', t === 'light' ? 'light' : ''); } catch (e) {} }, theme);
      const page = await ctx.newPage();
      for (const p of pages) {
        await page.goto(base + p, { waitUntil: 'networkidle' });
        await page.waitForTimeout(p.startsWith('#') || p === '' ? 1200 : 200);
        if (p === '') { await page.click('#s-go').catch(() => {}); await page.waitForTimeout(1200); }
        await page.addScriptTag({ content: axe });
        const res = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['color-contrast'] })).violations);
        for (const v of res) for (const n of v.nodes.slice(0, 3)) problems.push(`${theme} ${p || '/'}: contrast ${n.any?.[0]?.message?.split('.')[0] || ''} at ${n.target.join(' ')}`);
      }
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  if (problems.length) { console.error(`Page check failed (${problems.length}):\n- ${problems.slice(0, 40).join('\n- ')}`); process.exit(1); }
  console.log(`Page check passed: ${pages.length} pages, phone widths 320 and 375, contrast in light and dark.`);
})().catch((e) => { console.error(e); process.exit(1); });
