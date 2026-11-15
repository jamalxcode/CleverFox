// Fetches the official pages behind unverified apps and hosts (homepage, official and documentation links,
// and every access fact's source), keeping each page's readable text, so a review session can compare the
// listing's facts with what its own pages say. Runs in GitHub Actions ("Fetch pages for verification"),
// where the network reaches these sites; output goes to the `pages-cache` branch.
//
// Usage: node tools/fetch-pages.mjs [--all] [--out pages-cache]   (--all: verified listings too)
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = join(root, arg('--out', 'pages-cache'));
const ALL = process.argv.includes('--all');
export const RULES = { perListing: 18, maxChars: 60000, timeoutMs: 25000, concurrency: 4, renderBelowChars: 800 };
// Common official pages that often hold pricing and payment facts.
const EXTRA_PATHS = ['/pricing', '/plans', '/faq', '/terms'];

export function urlsOf(r) {
  const out = [r.url, ...(r.official_urls || []), ...(r.documentation_urls || [])];
  const visit = (o) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(visit); if (typeof o.source_url === 'string') out.push(o.source_url); for (const v of Object.values(o)) if (v && typeof v === 'object') visit(v); };
  visit(r.access); visit(r.data_centers); visit(r.gpu_types); visit(r.publisher_region); visit(r.provider_region); visit(r.interface_languages);
  // The publisher's own store listings, and its pricing, plans, FAQ and terms pages if they exist.
  out.push(...(r.app_store_urls || []));
  out.push(...(r.evidence_urls || []));
  try { const o = new URL(r.url || r.official_urls?.[0]).origin; out.push(...EXTRA_PATHS.map((p) => o + p)); } catch {}
  return [...new Set(out.filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)))].slice(0, RULES.perListing);
}

// Pages that load (HTTP 200) but show almost no text because they're built by JavaScript are opened again in
// a headless browser, when Playwright is installed (the fetch workflow installs it). It identifies itself as
// CleverFox's checker, like the plain fetch; pages that refuse automated visitors (401, 403, 429) are left alone.
let browser = null;
async function render(url) {
  try {
    if (!browser) { const { chromium } = await import('playwright'); browser = await chromium.launch(); }
    const page = await browser.newPage({ userAgent: 'CleverFox-verify/1.0 (+https://jamalxcode.github.io/CleverFox/)' });
    try {
      const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 40000 }).catch(() => null);
      if (!res || res.status() !== 200) return { status: res?.status() || 0, error: 'not rendered (no 200 answer)' };
      await page.waitForTimeout(1500);
      const title = await page.title().catch(() => '');
      const text = (await page.evaluate(() => document.body?.innerText || '').catch(() => '')).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
      return { status: 200, final_url: page.url(), title, chars: text.length, text: text.slice(0, RULES.maxChars), rendered: true };
    } finally { await page.close(); }
  } catch (e) { return { status: 0, error: `render failed: ${String(e.message || e).slice(0, 80)}` }; }
}

// Readable text: no scripts or styles; headings, list items and table cells on their own lines.
export function readable(html) {
  const title = (String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ').replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|br|td|th|dt|dd)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
  return { title, text };
}

async function fetchPage(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), RULES.timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; CleverFox-verify/1.0; +https://jamalxcode.github.io/CleverFox/)', accept: 'text/html,application/xhtml+xml,*/*', 'accept-language': 'en' } });
    const type = res.headers.get('content-type') || '';
    if (!res.ok) return { status: res.status, final_url: res.url };
    if (!/html|text|json|xml/.test(type)) return { status: res.status, final_url: res.url, note: `not a text page (${type})` };
    const { title, text } = readable(await res.text());
    return { status: res.status, final_url: res.url, title, chars: text.length, text: text.slice(0, RULES.maxChars) };
  } catch (e) { return { status: 0, error: e.name === 'AbortError' ? 'timeout' : String(e.message || e).slice(0, 100) }; } finally { clearTimeout(t); }
}

async function main() {
  const seed = readdirSync(join(root, 'data', 'seed')).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(readFileSync(join(root, 'data', 'seed', f), 'utf8')).map((r) => ({ ...r, _file: f })));
  const list = seed.filter((r) => (r.type === 'app' || r.type === 'host') && (ALL || r.verification_status !== 'verified'));
  rmSync(OUT, { recursive: true, force: true }); mkdirSync(join(OUT, 'pages'), { recursive: true });
  const jobs = list.flatMap((r) => urlsOf(r).map((u, i) => ({ id: r.id, file: r._file, url: u, n: i })));
  const index = {}; let next = 0; let ok = 0;
  await Promise.all(Array.from({ length: RULES.concurrency }, async () => {
    while (next < jobs.length) {
      const j = jobs[next++];
      let res = await fetchPage(j.url);
      // Only pages that answered 200 with almost no text (built by JavaScript) are rendered; refusals stay refusals.
      if (res.status === 200 && (res.chars || 0) < RULES.renderBelowChars) { const rr = await render(j.url); if (rr.text && rr.chars > (res.chars || 0)) res = rr; }
      const name = `${j.id.replace(/^cf:/, '').replace(/[^a-z0-9.-]+/gi, '_')}__${j.n}.txt`;
      if (res.text) { ok++; writeFileSync(join(OUT, 'pages', name), `URL: ${j.url}\nFINAL: ${res.final_url}\nSTATUS: ${res.status}\nTITLE: ${res.title}\nFETCHED: ${new Date().toISOString()}\n\n${res.text}\n`); }
      (index[j.id] ||= { file: j.file, pages: [] }).pages.push({ url: j.url, file: res.text ? `pages/${name}` : null, status: res.status, chars: res.chars || 0, rendered: !!res.rendered, error: res.error || res.note || null, final_url: res.final_url || null });
    }
  }));
  writeFileSync(join(OUT, 'index.json'), JSON.stringify({ fetched_at: new Date().toISOString(), listings: list.length, pages: jobs.length, readable: ok, index }, null, 1) + '\n');
  if (browser) await browser.close();
  console.log(`Fetched ${jobs.length} pages for ${list.length} listings; ${ok} readable.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
