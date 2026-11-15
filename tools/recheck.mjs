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
  return [...new Set(urls)].slice(0, RULES.perListing);
}

// Visible text only, without things that change on every load (tokens, nonces, long ids, times).
export function fingerprint(html) {
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/[A-Za-z0-9_+/=-]{24,}/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
  return { hash: createHash('sha256').update(text).digest('hex').slice(0, 16), length: text.length };
}

export async function checkUrl(url, fetchImpl = fetch) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), RULES.timeoutMs);
  try {
    const res = await fetchImpl(url, { redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': 'CleverFox-recheck/1.0 (+https://jamalxcode.github.io/CleverFox/)', accept: 'text/html,*/*' } });
    if (!res.ok) return { status: res.status };
    const { hash, length } = fingerprint(await res.text());
    return { status: res.status, hash, length };
  } catch (e) { return { status: 0, error: e.name === 'AbortError' ? 'timeout' : String(e.message || e).slice(0, 80) }; } finally { clearTimeout(t); }
}

// Merge one check into the stored state for that URL.
export function update(prev, res, now) {
  const s = { ...(prev || {}), checked_at: now };
  if (res.hash) {
    // Very short pages are usually bot walls or JavaScript shells: don't treat them as content changes.
    const usable = res.length >= 400;
    if (usable && s.hash && s.hash !== res.hash) s.changed_at = now;
    if (usable) { s.hash = res.hash; s.length = res.length; }
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
  const changed = []; const broken = []; let checked = null;
  for (const [u, facts] of seen) {
    const s = data.urls[u]; if (!s) continue;
    if (!checked || s.checked_at > checked) checked = s.checked_at;
    const oldest = facts.map((x) => x.observed_at).filter(Boolean).sort()[0];
    if (s.changed_at && oldest && s.changed_at > oldest) changed.push({ url: u, changed_at: s.changed_at, fields: facts.map((x) => x.field) });
    // Only a page that is really gone counts; bot walls (401/403/429) and network errors don't.
    if ((s.fails || 0) >= RULES.brokenAfter && [404, 410].includes(s.status)) broken.push({ url: u, status: s.status || null, since: s.ok_at || null });
  }
  return checked ? { checked_at: checked, changed, broken } : null;
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
