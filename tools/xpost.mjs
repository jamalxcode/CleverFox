// Weekly post on X: what's new on CleverFox this week, linking to the "new this week" page.
// Off unless the repo variable X_POST_ENABLED is "true" and the X posting keys are set
// (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET: OAuth 1.0a user context).
// Posts at most once a week, on Mondays (UTC), unless --force. State: data/imported/xpost-state.json.
//
// Usage: node tools/xpost.mjs [--dry-run] [--force]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, randomBytes } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://jamalxcode.github.io/CleverFox/';
const STATE = join(root, 'data', 'imported', 'xpost-state.json');
const POST_URL = 'https://api.x.com/2/tweets';

const pct = (s) => encodeURIComponent(String(s)).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
// OAuth 1.0a signature (HMAC-SHA1). `params` are query or form parameters; a JSON body isn't signed.
export function oauthHeader({ method, url, params = {}, key, secret, token, tokenSecret, nonce = randomBytes(16).toString('hex'), timestamp = Math.floor(Date.now() / 1000) }) {
  const oauth = { oauth_consumer_key: key, oauth_nonce: nonce, oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: String(timestamp), oauth_token: token, oauth_version: '1.0' };
  const all = { ...params, ...oauth };
  const paramStr = Object.keys(all).sort().map((k) => `${pct(k)}=${pct(all[k])}`).join('&');
  const base = [method.toUpperCase(), pct(url), pct(paramStr)].join('&');
  const signature = createHmac('sha1', `${pct(secret)}&${pct(tokenSecret)}`).update(base).digest('base64');
  return { signature, header: 'OAuth ' + Object.entries({ ...oauth, oauth_signature: signature }).sort().map(([k, v]) => `${pct(k)}="${pct(v)}"`).join(', ') };
}

// The post: counts of new listings by type and up to 3 names, within 280 characters (a link counts as 23).
export function composePost(records, now = new Date()) {
  const days = records.map((r) => (r.first_seen_at || '').slice(0, 10)).filter(Boolean).sort();
  const start = days[0];
  const cutoff = new Date(now - 7 * 86400000).toISOString();
  const fresh = records.filter((r) => r.first_seen_at && r.first_seen_at.slice(0, 10) !== start && r.first_seen_at >= cutoff && r.warning === 'none');
  if (!fresh.length) return null;
  const pop = (r) => (r.popularity || []).reduce((n, p) => n + (p.downloads_30d || 0) + (p.likes || 0) * 50, 0);
  const word = { model: ['model', 'models'], dataset: ['dataset', 'datasets'], app: ['app', 'apps'], host: ['hosting or API provider', 'hosting and API providers'] };
  const counts = Object.keys(word).map((t) => [t, fresh.filter((r) => r.type === t).length]).filter(([, n]) => n).map(([t, n]) => `${n} ${word[t][n > 1 ? 1 : 0]}`);
  const top = [...fresh].sort((a, b) => (a.type === 'app' || a.type === 'host' ? -1 : 0) - (b.type === 'app' || b.type === 'host' ? -1 : 0) || pop(b) - pop(a)).slice(0, 3).map((r) => r.name);
  const link = `${SITE}new/`;
  let text = `New on CleverFox this week: ${counts.join(', ')}. Including ${top.join(', ')}. What they do, if they work in your country, and how to pay without a card:`;
  const limit = 280 - 24; // a space and a link counted as 23
  while (text.length > limit && top.length > 1) { top.pop(); text = `New on CleverFox this week: ${counts.join(', ')}. Including ${top.join(', ')}. What they do, if they work in your country, and how to pay without a card:`; }
  if (text.length > limit) text = text.slice(0, limit - 1) + '…';
  return `${text} ${link}`;
}

async function main() {
  const dry = process.argv.includes('--dry-run'); const force = process.argv.includes('--force');
  const env = process.env;
  const now = new Date();
  const catalog = JSON.parse(readFileSync(join(root, 'data', 'catalog.json'), 'utf8'));
  const text = composePost(catalog.records, now);
  if (dry) { console.log(text || 'Nothing new this week.'); return; }
  if (env.X_POST_ENABLED !== 'true') { console.log('X posting is off (set the X_POST_ENABLED variable to true to turn it on).'); return; }
  if (!env.X_API_KEY || !env.X_API_SECRET || !env.X_ACCESS_TOKEN || !env.X_ACCESS_SECRET) { console.log('X posting keys are not set; skipped.'); return; }
  if (!force && now.getUTCDay() !== 1) { console.log('Not Monday; no weekly post today.'); return; }
  mkdirSync(dirname(STATE), { recursive: true });
  const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
  const week = now.toISOString().slice(0, 10);
  if (!force && state.last_post && (now - new Date(state.last_post)) / 86400000 < 6) { console.log('Already posted this week.'); return; }
  if (!text) { console.log('Nothing new this week; no post.'); return; }
  const { header } = oauthHeader({ method: 'POST', url: POST_URL, key: env.X_API_KEY, secret: env.X_API_SECRET, token: env.X_ACCESS_TOKEN, tokenSecret: env.X_ACCESS_SECRET });
  const res = await fetch(POST_URL, { method: 'POST', headers: { authorization: header, 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
  const body = await res.text();
  if (!res.ok) { console.warn(`X post failed: HTTP ${res.status} ${body.slice(0, 200)}`); return; }
  const id = JSON.parse(body)?.data?.id;
  writeFileSync(STATE, JSON.stringify({ last_post: now.toISOString(), week, id, text }, null, 1) + '\n');
  console.log(`Posted on X: https://x.com/i/status/${id}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
