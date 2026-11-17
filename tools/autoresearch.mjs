// Auto-research, rules only (decision 85): turns queued AI apps (App Store searches, Product Hunt launches) into
// "not yet verified" listings with facts read from official sources only, each with a quote, a link and a date:
//  - the App Store listing (Apple's lookup API, written by the publisher): name, seller, website, price, languages;
//  - the app's own website (home page, then its pricing / plans / FAQ pages): free plan or trial, ways to pay, sign-up.
// Nothing is guessed: a fact without a quote stays unknown. Countries come later from the daily App Store check
// (tools/appstore.mjs picks these listings up), never from silence on a page. robots.txt is respected, the fetcher
// says who it is, and 401/403/429 answers are left alone. Records are reviewed (decision 67) before "verified".
//
// Usage: node tools/autoresearch.mjs     Output: data/imported/apps-researched.json (+ autoresearch-state.json)
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { robotsAllows } from './discover.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'data', 'imported');
const OUT = join(outDir, 'apps-researched.json');
const STATE = join(outDir, 'autoresearch-state.json');
const UA = 'CleverFox/1.0 (+https://jamalxcode.github.io/CleverFox/)';
export const RULES = { newPerRun: 8, refreshDays: 14, pagesPerApp: 3, timeoutMs: 20000, quoteChars: 200 };

// Ways to pay, by words that only mean payment (stricter than the re-check's lists: no bare "card", "wire" or
// "app store", which also appear as download badges and in unrelated text).
export const PAY_TERMS = {
  paypal: ['paypal'], crypto: ['bitcoin', 'usdc', 'usdt', 'cryptocurrenc', 'pay with crypto', 'stablecoin'],
  mobile_money: ['m-pesa', 'mpesa', 'mobile money', 'airtel money', 'mtn momo', 'mtn mobile money', 'orange money', 'telebirr', 'ecocash', 'vodafone cash', 'tigo pesa'],
  upi: ['upi', 'unified payments interface'], pix: ['pix'], alipay: ['alipay', '支付宝'], wechat_pay: ['wechat pay', 'weixin pay', '微信支付'],
  bank_transfer: ['bank transfer', 'wire transfer', 'sepa', 'transferencia bancaria', 'transferência bancária'],
  app_store_billing: ['in-app purchase', 'billed through your apple', 'billed to your apple', 'google play billing', 'charged to your itunes', 'charged to your apple id'],
  prepaid_or_gift_card: ['gift card', 'prepaid card', 'redeem code'], carrier_billing: ['carrier billing', 'phone bill', 'operator billing'],
  card_international: ['visa', 'mastercard', 'american express', 'credit card', 'debit card'], card_local: ['rupay', 'unionpay', 'verve card', 'elo card', 'mir card', 'jcb'],
};
const FREE_TIER = /\b(free plan|free tier|free forever|free version|free account|forever free|basic plan is free|start for free|get started for free|free to use|use it for free)\b/i;
const TRIAL = /\b(free trial|\d+[- ]day trial|try (it )?free for \d+|trial period)\b/i;
const SIGNUP = /\b(sign (up|in)|log in|continue) with (google|apple|email|your email|phone|microsoft|github)[^.]{0,80}/i;

const wordRe = (w) => (/^[a-z]/.test(w) && w.length <= 5) ? new RegExp(`(^|[^a-z0-9])${w.replace(/[$.*+?^{}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i') : new RegExp(w.replace(/[$.*+?^{}()|[\]\\]/g, '\\$&'), 'i');
export const visibleText = (html) => String(html || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
// The sentence around a match, trimmed to quoteChars: the quote kept with the fact.
export function quoteAround(text, re) {
  const m = re.exec(text); if (!m) return null;
  const s = Math.max(text.lastIndexOf('. ', m.index) + 2, m.index - 120, 0); const e = Math.min(text.indexOf('. ', m.index + m[0].length) + 1 || text.length, s + RULES.quoteChars);
  return text.slice(s, e).trim();
}
// Facts from official pages: { free, payment_methods, signup }, each with a quote and the page it came from.
export function extractFacts(pages) {
  const facts = { free: null, payment_methods: [], signup: null };
  for (const p of pages) {
    const t = p.text;
    if (!facts.free) { const q = quoteAround(t, FREE_TIER); if (q) facts.free = { value: 'free_tier', quote: q, url: p.url }; }
    if (!facts.free) { const q = quoteAround(t, TRIAL); if (q) facts.free = { value: 'trial', quote: q, url: p.url }; }
    if (!facts.signup) { const q = quoteAround(t, SIGNUP); if (q) facts.signup = { value: q, url: p.url }; }
    if (!p.billing) continue; // ways to pay only from pricing / plans / billing / FAQ pages
    for (const [method, words] of Object.entries(PAY_TERMS)) {
      if (facts.payment_methods.some((x) => x.method === method)) continue;
      for (const w of words) { const q = quoteAround(t, wordRe(w)); if (q) { facts.payment_methods.push({ method, note: `"${q}"`, url: p.url }); break; } }
    }
  }
  return facts;
}
// Links on the home page to its pricing / plans / FAQ pages (same site only).
export function billingLinks(html, base) {
  const out = [];
  for (const [, href, label] of String(html).matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u; try { u = new URL(href, base); } catch { continue; }
    if (u.hostname !== new URL(base).hostname) continue;
    const key = `${u.pathname} ${visibleText(label)}`.toLowerCase();
    if (/pric|plans?\b|premium|subscri|upgrade|billing|payment|faq|help/.test(key) && !out.includes(u.href)) out.push(u.href);
  }
  return out.sort((a, b) => (/pric|plan/.test(b) - /pric|plan/.test(a))).slice(0, RULES.pagesPerApp - 1);
}

const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9.]+/g, '-').replace(/^[-.]+|[-.]+$/g, '') || 'x';
const day = (iso) => iso.slice(0, 10) + 'T00:00:00Z';
const claim = (value, url, type = 'official', at) => (value === 'unknown' || value == null) ? { value: 'unknown', source_url: null, source_type: null, observed_at: at } : { value, source_url: url, source_type: type, observed_at: at };
const words = (s, n) => { const w = String(s || '').replace(/\s+/g, ' ').trim().split(' '); return w.slice(0, n).join(' ').replace(/[.,;:]$/, '') + (w.length > n ? '…' : ''); };

// Categories from the publisher's own words (App Store description, Product Hunt tagline, home page opening),
// by whole-word rules; "other" when nothing matches.
export const CATEGORY_RULES = [['chat', /\b(chat|chatbot|assistant|ask anything|conversation)/i], ['writing', /\b(writ(e|ing|er)|essay|grammar|copywrit)/i], ['image', /\b(image|photo|picture|art generator|avatar|headshot)/i],
  ['audio', /\b(voice|speech|transcri|audio|dictat)/i], ['video', /\bvideo/i], ['music', /\b(music|song)/i], ['coding', /\b(code|coding|programming|developer)/i],
  ['translation', /\btranslat/i], ['search', /\b(search|answer engine)/i], ['research', /\bresearch/i]];
export const categoriesOf = (text) => { const c = CATEGORY_RULES.filter(([, re]) => re.test(text)).map(([k]) => k); return c.length ? c.slice(0, 4) : ['other']; };

// One listing from what was read. Only stated facts; the rest stays unknown.
export function appRecord({ app, store, site, pages, facts, now }) {
  const at = day(now);
  const name = String(store?.trackName || app.name).replace(/\s*[-–:|].*$/, '').trim() || app.name;
  // Without a stated seller (a Product Hunt launch with no App Store listing), the app is named by its own website.
  let host = null; try { host = site ? new URL(site).hostname.replace(/^www\./, '') : null; } catch {}
  const seller = store?.sellerName || app.seller || app.maker || host || 'unknown';
  const by = store?.sellerName || app.seller || app.maker ? `by ${seller}` : `from ${seller}`;
  const about = app.tagline || String(store?.description || '').split(/(?<=[.!?])\s/)[0];
  const pm = facts.payment_methods.map((m) => ({ method: m.method, note: m.note }));
  const pmUrl = facts.payment_methods[0]?.url;
  return {
    schema_version: 1, id: `cf:app:${slug(seller).replace(/\./g, '-')}/${slug(name)}`, type: 'app', name,
    description: (() => { const head = `AI app ${by}`; const room = Math.max(4, 28 - head.split(/\s+/).length); const tail = about ? words(about, room) : ''; return `${head}${tail ? `: ${tail}` : ''}${/[.…!?]$/.test(tail) ? '' : '.'}`; })(),
    publisher: seller, publisher_region: claim('unknown', null, null, at),
    official_urls: [site].filter(Boolean), documentation_urls: pages.filter((p) => p.url !== site).map((p) => p.url),
    evidence_urls: [...new Set([store?.lookup, ...pages.map((p) => p.url)].filter(Boolean))],
    verification_status: 'candidate', warning: 'none', first_seen_at: at, last_content_change_at: at, relations: [],
    url: site || store?.url || null, app_store_urls: store?.url ? [store.url] : [], categories: categoriesOf([store?.trackName || name, app.tagline, String(store?.description || '').slice(0, 600), String(pages[0]?.text || '').slice(0, 600)].join(' ')), models_used: [],
    interface_languages: store?.languages?.length ? claim(store.languages, store.lookup, 'official', at) : claim('unknown', null, null, at),
    access: {
      free: facts.free ? claim(facts.free.value, facts.free.url, 'official', at) : claim('unknown', null, null, at),
      free_limits: facts.free ? `"${facts.free.quote}"` : null,
      payment_methods: pm.length ? claim(pm, pmUrl, 'official', at) : claim('unknown', null, null, at),
      countries_available: claim('unknown', null, null, at), countries_unavailable: claim('unknown', null, null, at),
      signup_requirements: facts.signup ? claim(facts.signup.value, facts.signup.url, 'official', at) : claim('unknown', null, null, at),
      local_currency_pricing: claim('unknown', null, null, at),
    },
    store_price: store ? { free_download: store.price === 0, price: store.formattedPrice || null, source_url: store.lookup, observed_at: at } : undefined,
    research: { method: 'rules', at: now, from: app.from, pages: pages.map((p) => p.url), quotes: [facts.free && { field: 'free', quote: facts.free.quote, url: facts.free.url }, facts.signup && { field: 'signup_requirements', quote: facts.signup.value, url: facts.signup.url }, ...facts.payment_methods.map((m) => ({ field: `payment:${m.method}`, quote: m.note.slice(1, -1), url: m.url }))].filter(Boolean) },
    discovered_via: { source: app.from === 'product_hunt' ? 'product-hunt' : 'app-store', url: app.source_url, created_at: app.created_at || now },
  };
}

// ---- fetching (honest, robots.txt respected, refusals left alone) ----
export async function fetchPage(url, fetchImpl, robotsCache) {
  const u = new URL(url);
  robotsCache[u.origin] ??= await fetchImpl(`${u.origin}/robots.txt`, { headers: { 'user-agent': UA } }).then((r) => (r.ok ? r.text() : '')).catch(() => '');
  if (!robotsAllows(robotsCache[u.origin], u.pathname)) return { url, skipped: 'robots.txt' };
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), RULES.timeoutMs);
  try {
    const res = await fetchImpl(url, { headers: { 'user-agent': UA, accept: 'text/html' }, signal: ctl.signal, redirect: 'follow' });
    if (!res.ok) return { url, skipped: `HTTP ${res.status}` };
    return { url: res.url || url, html: await res.text() };
  } catch (e) { return { url, skipped: `failed: ${String(e.message || e).slice(0, 40)}` }; } finally { clearTimeout(t); }
}

export async function research({ queue, known, prev = {}, fetchImpl = fetch, now = new Date().toISOString(), log = console.log } = {}) {
  const state = { ...(prev.apps || {}) };
  const robotsCache = {};
  const due = queue.filter((a) => !known(a) && (!state[a.key] || (Date.parse(now) - Date.parse(state[a.key].at)) / 86400000 >= RULES.refreshDays)).slice(0, RULES.newPerRun);
  // App Store details for the ones with an id, in one lookup.
  const ids = due.map((a) => a.apple_id).filter(Boolean);
  const store = {};
  if (ids.length) {
    try {
      const lookup = `https://itunes.apple.com/lookup?id=${ids.join(',')}&country=us&entity=software`;
      const res = await fetchImpl(lookup, { headers: { 'user-agent': UA } });
      if (res.ok) for (const x of (await res.json()).results || []) store[String(x.trackId)] = { trackName: x.trackName, sellerName: x.sellerName || x.artistName, url: String(x.trackViewUrl || '').split('?')[0], website: x.sellerUrl || null, price: x.price ?? null, formattedPrice: x.formattedPrice || null, description: x.description || '', languages: (x.languageCodesISO2A || []).map((l) => String(l).toLowerCase()), lookup: `https://itunes.apple.com/lookup?id=${x.trackId}` };
    } catch (e) { log(`Auto-research: App Store lookup failed (${e.message})`); }
  }
  for (const app of due) {
    const st = app.apple_id ? store[String(app.apple_id)] : null;
    let site = st?.website || app.website || null;
    if (site && known.site?.(site)) { state[app.key] = { at: now, skipped: 'already listed (same website)' }; continue; }
    const pages = [];
    if (site) {
      const home = await fetchPage(site, fetchImpl, robotsCache);
      if (home.html) {
        site = home.url.replace(/\/$/, '/');
        if (known.site?.(site)) { state[app.key] = { at: now, skipped: 'already listed (same website)' }; continue; }
        pages.push({ url: home.url, text: visibleText(home.html), billing: /pric|plan|billing|faq/i.test(new URL(home.url).pathname) });
        for (const link of billingLinks(home.html, home.url)) { const p = await fetchPage(link, fetchImpl, robotsCache); if (p.html) pages.push({ url: p.url, text: visibleText(p.html), billing: true }); }
      }
    }
    if (!st && !pages.length) { state[app.key] = { at: now, skipped: site ? 'website not readable' : 'no website' }; continue; }
    const facts = extractFacts(pages);
    const rec = appRecord({ app, store: st, site: pages[0]?.url || site, pages, facts, now });
    state[app.key] = { at: now, id: rec.id, pages_read: pages.length, site, record: rec };
  }
  const records = Object.values(state).map((s) => s.record).filter(Boolean);
  const run = due.map((a) => state[a.key]).filter(Boolean);
  log(`Auto-research: this run ${run.filter((s) => s.record).length} listed, ${run.filter((s) => s.skipped).length} skipped (${[...new Set(run.map((s) => s.skipped).filter(Boolean))].join('; ') || 'none'}), websites read for ${run.filter((s) => s.pages_read).length}, ${run.reduce((n, s) => n + (s.pages_read || 0), 0)} pages`);
  log(`Auto-research: ${due.length} researched this run, ${records.length} listings in all (${records.filter((r) => r.access.free.value !== 'unknown').length} with a free plan stated, ${records.filter((r) => Array.isArray(r.access.payment_methods.value)).length} with ways to pay)`);
  return { state: { checked_at: now, apps: state }, records };
}

// The queue: popular App Store apps not yet listed, and Product Hunt launches.
export function queueFrom(disc) {
  const q = [];
  for (const a of disc.app_store?.apps || []) q.push({ key: `apple:${a.id}`, from: 'app_store', apple_id: a.id, name: a.name, seller: a.seller, source_url: a.url, created_at: disc.app_store.checked_at });
  for (const l of disc.product_hunt?.launches || []) if (l.website) q.push({ key: `ph:${l.url}`, from: 'product_hunt', name: l.name, tagline: l.tagline, website: l.website, source_url: l.url, created_at: l.created_at });
  return q;
}
// Already listed (hand-researched): by App Store id or name.
const siteOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').split('.').slice(-2).join('.'); } catch { return null; } };
export function knownCheck(dir = join(root, 'data')) {
  const ids = new Set(); const names = new Set(); const sites = new Set();
  for (const f of readdirSync(join(dir, 'seed')).filter((x) => x.endsWith('.json'))) for (const r of JSON.parse(readFileSync(join(dir, 'seed', f), 'utf8'))) {
    if (r.type !== 'app') continue; names.add(String(r.name).toLowerCase().replace(/\s*\(.*?\)/g, '').trim());
    for (const u of r.app_store_urls || []) { const id = String(u).match(/id(\d{6,})/)?.[1]; if (id) ids.add(id); }
    for (const u of [r.url, ...(r.official_urls || [])]) { const s = siteOf(u); if (s && !/^(apple|github)\.com$/.test(s)) sites.add(s); }
  }
  const check = (a) => (a.apple_id && ids.has(String(a.apple_id))) || names.has(String(a.name).toLowerCase().replace(/\s*\(.*?\)/g, '').trim());
  check.site = (u) => { const s = siteOf(u); return !!s && sites.has(s); };
  return check;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const disc = existsSync(join(outDir, 'discover.json')) ? JSON.parse(readFileSync(join(outDir, 'discover.json'), 'utf8')) : {};
  const prev = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
  const { state, records } = await research({ queue: queueFrom(disc), known: knownCheck(), prev });
  // Records are never silently lost: earlier listings stay unless researched again.
  writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');
  writeFileSync(OUT, JSON.stringify(records, null, 1) + '\n');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(`Auto-research failed: ${e.message}`); process.exit(0); });
