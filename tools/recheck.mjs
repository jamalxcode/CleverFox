// Re-checks the source pages behind access facts (free, payments, countries, sign-up, local pricing)
// for apps, hosting and API distributions. Each page's visible text is fingerprinted; the build warns
// when a page changed after its facts were checked, or when a source link keeps failing.
// It never edits facts itself: a changed page means "check again", not a new value.
//
// Usage: node tools/recheck.mjs      Writes data/imported/recheck.json (kept on the data branch).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data', 'imported', 'recheck.json');
export const RULES = { perListing: 6, concurrency: 4, timeoutMs: 20000, brokenAfter: 2 };
const ACCESS_FIELDS = ['free', 'payment_methods', 'countries_available', 'countries_unavailable', 'signup_requirements', 'local_currency_pricing'];

// The URLs worth watching for one record: where its access facts came from.
export function watchUrls(r) {
  const accs = r.access ? [r.access] : (r.distributions || []).map((d) => d.access).filter(Boolean);
  const urls = [];
  for (const a of accs) for (const f of ACCESS_FIELDS) { const u = a[f]?.source_url; if (u && /^https?:\/\//.test(u)) urls.push(u); }
  // The app's or provider's own homepage too: if it's gone, the listing may be discontinued.
  if (r.url && /^https?:\/\//.test(r.url)) urls.unshift(r.url);
  return [...new Set(urls)].slice(0, RULES.perListing + 1);
}

// Words that show a fact is stated on a page, per payment method and for "free". Many languages.
// A method is confirmed when any of its words appears on the source page. "other" can't be checked.
export const TERMS = {
  paypal: ['paypal'], crypto: ['crypto', 'bitcoin', 'usdc', 'usdt', 'stablecoin', 'cryptocurrenc', 'criptomoeda', 'криптовалют'],
  mobile_money: ['m-pesa', 'mpesa', 'mobile money', 'momo', 'airtel money', 'mtn money', 'orange money', 'telebirr', 'wave', 'ecocash', 'vodafone cash', 'tigo pesa'],
  upi: ['upi', 'unified payments interface'], pix: ['pix'], alipay: ['alipay', '支付宝'], wechat_pay: ['wechat pay', 'weixin pay', '微信支付'],
  bank_transfer: ['bank transfer', 'wire transfer', 'wire', 'sepa', 'ach', 'virtual account', 'transferencia', 'transferência', 'chuyển khoản', 'перевод', '銀行振込', 'تحويل بنكي', 'transfer bank'],
  app_store_billing: ['app store', 'google play', 'in-app purchase', 'apple id', 'play store'],
  prepaid_or_gift_card: ['gift card', 'prepaid', 'voucher', 'redeem code'], carrier_billing: ['carrier billing', 'phone bill', 'mobile billing', 'operator billing', 'carrier'],
  card_international: ['visa', 'mastercard', 'american express', 'amex', 'credit card', 'debit card', 'card'], card_local: ['card', 'debit', 'rupay', 'elo', 'verve', 'mir', 'unionpay', 'jcb', 'kartu', 'cartão', 'thẻ', '카드'],
  free: ['free', 'trial', '$0', 'gratis', 'grátis', 'gratuit', 'kostenlos', 'бесплатно', 'مجاني', 'مجانا', '免费', '無料', '무료', 'miễn phí', 'ฟรี', 'bure', 'मुफ़्त', 'मुफ्त', 'rp0', 'rm 0', 'rm0'],
};
const has = (text, w) => (/^[a-z$]/.test(w) && w.length <= 5) ? new RegExp(`(^|[^a-z0-9])${w.replace(/[$.*+?^{}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text) : text.includes(w);
export function termsIn(text) { return Object.entries(TERMS).filter(([, ws]) => ws.some((w) => has(text, w))).map(([k]) => k); }

// Visible text only, without things that change on every load (tokens, nonces, long ids, times).
export function fingerprint(html) {
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/[A-Za-z0-9_+/=-]{24,}/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
  return { hash: createHash('sha256').update(text).digest('hex').slice(0, 16), length: text.length, terms: termsIn(text) };
}

export async function checkUrl(url, fetchImpl = fetch) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), RULES.timeoutMs);
  try {
    const res = await fetchImpl(url, { redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': 'CleverFox-recheck/1.0 (+https://jamalxcode.github.io/CleverFox/)', accept: 'text/html,*/*' } });
    if (!res.ok) return { status: res.status };
    const { hash, length, terms } = fingerprint(await res.text());
    return { status: res.status, hash, length, terms };
  } catch (e) { return { status: 0, error: e.name === 'AbortError' ? 'timeout' : String(e.message || e).slice(0, 80) }; } finally { clearTimeout(t); }
}

// Merge one check into the stored state for that URL.
export function update(prev, res, now) {
  const s = { ...(prev || {}), checked_at: now };
  if (res.hash) {
    // Very short pages are usually bot walls or JavaScript shells: don't treat them as content changes.
    const usable = res.length >= 400;
    if (usable && s.hash && s.hash !== res.hash) s.changed_at = now;
    if (usable) { s.hash = res.hash; s.length = res.length; s.terms = res.terms || []; }
    s.ok_at = now; s.fails = 0; s.status = res.status;
  } else {
    s.fails = (s.fails || 0) + 1; s.status = res.status; s.error = res.error;
  }
  return s;
}

function seedRecords() {
  const dir = join(root, 'data', 'seed');
  return readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

export async function run({ records = seedRecords(), prev = {}, fetchImpl = fetch, now = new Date().toISOString().replace(/\.\d+Z$/, 'Z'), log = console.log } = {}) {
  const urls = [...new Set(records.flatMap(watchUrls))];
  const state = { ...(prev.urls || {}) };
  let i = 0; let changed = 0; let failed = 0;
  await Promise.all(Array.from({ length: RULES.concurrency }, async () => {
    while (i < urls.length) {
      const u = urls[i++];
      const res = await checkUrl(u, fetchImpl);
      const s = update(state[u], res, now);
      if (s.changed_at === now) changed++;
      if (!res.hash) failed++;
      state[u] = s;
    }
  }));
  log(`Re-check: ${urls.length} source pages, ${changed} changed since last time, ${failed} could not be read`);
  return { checked_at: now, urls: state };
}

// What the build shows for one record: changes after its facts were checked, and links that keep failing.
export function accessCheck(r, data) {
  if (!data?.urls) return null;
  const accs = r.access ? [r.access] : (r.distributions || []).map((d) => d.access).filter(Boolean);
  const seen = new Map();
  for (const a of accs) for (const f of ACCESS_FIELDS) { const c = a[f]; if (c?.source_url) seen.set(c.source_url, [...(seen.get(c.source_url) || []), { field: f, observed_at: c.observed_at }]); }
  if (!seen.size) return null;
  const changed = []; const broken = []; const facts = []; let checked = null;
  for (const [u, facts] of seen) {
    const s = data.urls[u]; if (!s) continue;
    if (!checked || s.checked_at > checked) checked = s.checked_at;
    const oldest = facts.map((x) => x.observed_at).filter(Boolean).sort()[0];
    if (s.changed_at && oldest && s.changed_at > oldest) changed.push({ url: u, changed_at: s.changed_at, fields: facts.map((x) => x.field) });
    // Only a page that is really gone counts; bot walls (401/403/429) and network errors don't.
    if ((s.fails || 0) >= RULES.brokenAfter && [404, 410].includes(s.status)) broken.push({ url: u, status: s.status || null, since: s.ok_at || null });
  }
  // Fact checks: is each stated payment method, and "free", written on its source page?
  for (const a of accs) {
    const pm = a.payment_methods; const s = pm?.source_url && data.urls[pm.source_url];
    if (Array.isArray(pm?.value) && s?.terms) {
      const want = [...new Set(pm.value.map((m) => m.method).filter((m) => TERMS[m]))];
      if (want.length) facts.push(factResult('payment_methods', pm.source_url, want, s.terms, s.checked_at));
    }
    const fr = a.free; const f = fr?.source_url && data.urls[fr.source_url];
    if (['free', 'free_tier', 'trial'].includes(fr?.value) && f?.terms) facts.push(factResult('free', fr.source_url, ['free'], f.terms, f.checked_at));
  }
  return checked ? { checked_at: checked, changed, broken, facts } : null;
}
function factResult(field, url, want, terms, at) {
  const found = want.filter((w) => terms.includes(w));
  return { field, url, want, found, missing: want.filter((w) => !found.includes(w)), status: found.length === want.length ? 'confirmed' : found.length ? 'partly' : 'not_found', checked_at: at };
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  try {
    const out = await run({ prev });
    writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  } catch (e) { console.warn(`Re-check failed, keeping the last results: ${e.message}`); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
