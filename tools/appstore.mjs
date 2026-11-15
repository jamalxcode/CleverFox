// App Store check (Apple's public iTunes lookup and search APIs, no key needed):
//  1. confirm each candidate Apple id: the seller must match the publisher before the id is used;
//  2. which countries' App Stores carry each confirmed app (a rotating batch of storefronts a day);
//  3. look-alike apps: apps using the brand name from other sellers (a rotating batch of brands a day).
// Candidates come from data/app-stores.json and apps.apple.com links in seed records.
// Output: data/imported/appstore.json (kept on the data branch). Keeps last data on failure.
//
// Usage: node tools/appstore.mjs   (behind a proxy: NODE_USE_ENV_PROXY=1)
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data', 'imported', 'appstore.json');
export const RULES = { countriesPerRun: 50, brandsPerRun: 10, delayMs: 3000, lookalikeLimit: 50, budgetMs: 6 * 60000, maxLimited: 2 };
// Apple storefront country codes.
export const STOREFRONTS = ('AE AF AG AI AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BJ BM BN BO BR BS BT BW BY BZ CA CD CG CH CI CL CM CN CO CR CV CY CZ DE DK DM DO DZ EC EE EG ES FI FJ FM FR GA GB GD GE GH GM GR GT GW GY HK HN HR HU ID IE IL IN IQ IS IT JM JO JP KE KG KH KN KR KW KY KZ LA LB LC LK LR LT LU LV LY MA MD ME MG MK ML MM MN MO MR MS MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SE SG SI SK SL SN SR ST SV SZ TC TD TH TJ TM TN TO TR TT TW TZ UA UG US UY UZ VC VE VG VN VU XK YE ZA ZM ZW').split(' ');

const STOP = new Set(['inc', 'ltd', 'llc', 'l', 'c', 'pte', 'co', 'corp', 'corporation', 'company', 'the', 'gmbh', 'sa', 's', 'a', 'sas', 'fzco', 'fz', 'llp', 'plc', 'limited', 'technology', 'technologies', 'tech', 'trading', 'general', 'group', 'holdings', 'software', 'apps', 'app', 'ai', 'labs', 'lab', 'and', 'of', 'com', 'systems', 'computer', 'network', 'netcom', 'information', 'solutions', 'studio', 'studios', 'global', 'international', 'pbc', 'sl', 'bv', 'ag', 'oy', 'ab', 'kk', 'shenzhen', 'beijing', 'hangzhou', 'shanghai', 'singapore']);
export const tokens = (s) => new Set(String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter((t) => t.length > 1 && !STOP.has(t)));
// The seller matches if it shares a meaningful word with the expected seller or the publisher.
export function sellerMatches(seller, expected) {
  const s = tokens(seller);
  return expected.filter(Boolean).some((e) => [...tokens(e)].some((t) => s.has(t)));
}
export const AI_WORDS = /\b(ai|a\.i\.|chat|chatbot|gpt|bot|assistant|llm|copilot|agent)\b/i;
export const brandOf = (name) => String(name).replace(/\s*\(.*?\)\s*/g, ' ').trim().split(/\s+/)[0].replace(/[^\p{L}\p{N}.-]/gu, '');

function candidates() {
  const list = new Map();
  const file = join(root, 'data', 'app-stores.json');
  const stores = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const seed = readdirSync(join(root, 'data', 'seed')).filter((f) => f.startsWith('apps')).flatMap((f) => JSON.parse(readFileSync(join(root, 'data', 'seed', f), 'utf8')));
  for (const r of seed) {
    const s = stores[r.id] || {};
    const fromUrl = (r.app_store_urls || []).map((u) => u.match(/apps\.apple\.com\/(?:([a-z]{2})\/)?.*?id(\d+)/)).find(Boolean);
    const appleId = s.apple_id || (fromUrl ? +fromUrl[2] : null);
    if (!appleId) continue;
    list.set(r.id, { id: r.id, name: r.name, apple_id: +appleId, store: s.apple_store || fromUrl?.[1] || 'us', expected: [s.expected_seller, r.publisher, r.publisher_name] });
  }
  return [...list.values()];
}

export async function run({ apps = candidates(), prev = {}, fetchImpl = fetch, now = new Date().toISOString().replace(/\.\d+Z$/, 'Z'), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), log = console.log } = {}) {
  const out = { checked_at: now, cursor: { ...(prev.cursor || { country: 0, brand: 0 }) }, apps: JSON.parse(JSON.stringify(prev.apps || {})) };
  // Stop early when Apple rate-limits repeatedly or the time budget runs out; what's done so far is kept.
  const started = Date.now(); let limited = 0;
  const stopped = () => limited >= RULES.maxLimited || Date.now() - started > RULES.budgetMs;
  const get = async (url) => {
    if (stopped()) return null;
    for (let i = 0; i < 2; i++) {
      try {
        const res = await fetchImpl(url, { headers: { 'user-agent': 'CleverFox/1.0 (+https://jamalxcode.github.io/CleverFox/)' } });
        if (res.status === 429 || res.status === 403) { if (++limited >= RULES.maxLimited) return null; await sleep(30000); continue; }
        limited = 0;
        if (!res.ok) return null;
        return await res.json();
      } catch { await sleep(5000); }
    }
    return null;
  } ;
  // 1. Confirm ids, per home store, in batches.
  const byStore = new Map();
  for (const a of apps) byStore.set(a.store, [...(byStore.get(a.store) || []), a]);
  let confirmed = 0; let rejected = 0;
  for (const [store, list] of byStore) {
    for (let i = 0; i < list.length; i += 100) {
      const batch = list.slice(i, i + 100);
      const url = `https://itunes.apple.com/lookup?id=${batch.map((a) => a.apple_id).join(',')}&country=${store}&entity=software`;
      const data = await get(url); await sleep(RULES.delayMs);
      if (!data) continue;
      for (const a of batch) {
        const hit = (data.results || []).find((x) => +x.trackId === a.apple_id);
        const e = out.apps[a.id] ||= {};
        if (!hit) { e.apple = { ...(e.apple || {}), id: a.apple_id, found: false, missing: (e.apple?.missing || 0) + 1, checked_at: now }; continue; }
        const ok = sellerMatches(hit.sellerName, a.expected) || sellerMatches(hit.artistName, a.expected);
        e.apple = { id: a.apple_id, found: true, confirmed: ok, ever_confirmed: ok || !!e.apple?.ever_confirmed, missing: 0, seller: hit.sellerName || hit.artistName, name: hit.trackName, url: (hit.trackViewUrl || '').split('?')[0],
          rating: hit.averageUserRating ? +hit.averageUserRating.toFixed(1) : null, ratings: hit.userRatingCount || 0, price: hit.formattedPrice || null, languages: (hit.languageCodesISO2A || []).map((l) => String(l).toLowerCase()), store, checked_at: now };
        ok ? confirmed++ : rejected++;
      }
    }
  }
  const ok = apps.filter((a) => out.apps[a.id]?.apple?.confirmed);
  log(`App Store: ${confirmed} ids confirmed by seller, ${rejected} rejected (seller doesn't match)`);
  // 2. Countries, a rotating batch of storefronts.
  if (ok.length) {
    for (let n = 0; n < RULES.countriesPerRun; n++) {
      const cc = STOREFRONTS[(out.cursor.country + n) % STOREFRONTS.length];
      const data = await get(`https://itunes.apple.com/lookup?id=${ok.map((a) => a.apple_id).join(',')}&country=${cc.toLowerCase()}&entity=software`); await sleep(RULES.delayMs);
      if (!data) continue;
      const have = new Set((data.results || []).map((x) => +x.trackId));
      for (const a of ok) { const e = out.apps[a.id]; (e.countries ||= {})[cc] = have.has(a.apple_id); e.countries_checked_at = now; }
    }
    if (!stopped()) out.cursor.country = (out.cursor.country + RULES.countriesPerRun) % STOREFRONTS.length;
  }
  // 3. Look-alikes for a rotating batch of brands (US store).
  for (let n = 0; n < Math.min(RULES.brandsPerRun, ok.length); n++) {
    const a = ok[(out.cursor.brand + n) % ok.length];
    const brand = brandOf(a.name); if (brand.length < 4) continue;
    const data = await get(`https://itunes.apple.com/search?term=${encodeURIComponent(brand)}&entity=software&country=us&limit=${RULES.lookalikeLimit}`); await sleep(RULES.delayMs);
    if (!data) continue;
    const official = out.apps[a.id].apple.seller;
    // A look-alike uses the brand AND presents itself as an AI app (so a horoscope app called "Gemini" doesn't count).
    const like = (data.results || []).filter((x) => +x.trackId !== a.apple_id && String(x.trackName || '').toLowerCase().includes(brand.toLowerCase()) && AI_WORDS.test(String(x.trackName || '')) && !sellerMatches(x.sellerName, [official, ...a.expected]));
    out.apps[a.id].lookalikes = { v: 2, count: like.length, examples: like.slice(0, 3).map((x) => ({ name: x.trackName, seller: x.sellerName })), brand, checked_at: now };
  }
  if (stopped()) log(`App Store: stopped early (${limited >= RULES.maxLimited ? 'rate-limited' : 'time budget'}); kept what was checked`);
  if (ok.length) out.cursor.brand = (out.cursor.brand + RULES.brandsPerRun) % ok.length;
  return out;
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  try { writeFileSync(OUT, JSON.stringify(await run({ prev }), null, 1) + '\n'); } catch (e) { console.warn(`App Store check failed, keeping the last data: ${e.message}`); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
