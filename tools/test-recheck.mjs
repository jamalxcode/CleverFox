// Offline tests for tools/recheck.mjs (no network).
import assert from 'node:assert/strict';
import { watchUrls, fingerprint, update, run, accessCheck } from './recheck.mjs';

const claim = (u, at = '2026-11-14T00:00:00Z') => ({ value: 'x', source_url: u, source_type: 'official', observed_at: at });
const app = { id: 'cf:app:a/b', type: 'app', access: { free: claim('https://a.example/pricing'), payment_methods: claim('https://a.example/pricing'), countries_available: claim('https://a.example/countries'), signup_requirements: { value: 'unknown', source_url: null } } };
assert.deepEqual(watchUrls(app), ['https://a.example/pricing', 'https://a.example/countries']);
const model = { type: 'model', distributions: [{ source: 'huggingface' }, { source: 'api', access: { free: claim('https://m.example/api') } }] };
assert.deepEqual(watchUrls(model), ['https://m.example/api']);

// Fingerprint ignores scripts, tags, tokens and times, not words.
const page = (body) => `<html><script>var nonce="${Math.random()}"</script><body><p>${body}</p><span>csrf abcdefghijklmnopqrstuvwxyz0123456789</span> 12:34</body></html>`;
assert.equal(fingerprint(page('Pay with M-Pesa or card')).hash, fingerprint(page('Pay with M-Pesa or card')).hash);
assert.notEqual(fingerprint(page('Pay with M-Pesa or card')).hash, fingerprint(page('Pay with card only')).hash);

// update(): change detected only after a first fingerprint, and only for real pages.
let s = update(null, { status: 200, hash: 'h1', length: 1000 }, 'T1');
assert.equal(s.changed_at, undefined);
s = update(s, { status: 200, hash: 'h1', length: 1000 }, 'T2'); assert.equal(s.changed_at, undefined);
s = update(s, { status: 200, hash: 'h2', length: 1000 }, 'T3'); assert.equal(s.changed_at, 'T3');
s = update(s, { status: 200, hash: 'h9', length: 50 }, 'T4'); assert.equal(s.hash, 'h2', 'a tiny page (bot wall) is not a change');
s = update(s, { status: 403 }, 'T5'); s = update(s, { status: 403 }, 'T6'); assert.equal(s.fails, 2); assert.equal(s.hash, 'h2');

// Full run with a stubbed fetch, then what the build shows.
const pages = { 'https://a.example/pricing': 'Pricing: M-Pesa accepted. '.repeat(30), 'https://a.example/countries': null };
const fetchImpl = async (u) => pages[u] == null ? { ok: false, status: 404 } : { ok: true, status: 200, text: async () => pages[u] };
let data = await run({ records: [app], fetchImpl, now: '2026-11-15T00:00:00Z', log: () => {} });
data = await run({ records: [app], prev: data, fetchImpl, now: '2026-11-16T00:00:00Z', log: () => {} });
pages['https://a.example/pricing'] = 'Pricing: card only. '.repeat(30);
data = await run({ records: [app], prev: data, fetchImpl, now: '2026-11-17T00:00:00Z', log: () => {} });
const chk = accessCheck(app, data);
assert.equal(chk.checked_at, '2026-11-17T00:00:00Z');
assert.equal(chk.changed.length, 1); assert.deepEqual(chk.changed[0].fields, ['free', 'payment_methods']);
assert.equal(chk.broken.length, 1); assert.equal(chk.broken[0].url, 'https://a.example/countries');
// Facts re-checked after the change: no warning.
const fresh = { ...app, access: { ...app.access, free: claim('https://a.example/pricing', '2026-11-18T00:00:00Z'), payment_methods: claim('https://a.example/pricing', '2026-11-18T00:00:00Z') } };
assert.equal(accessCheck(fresh, data).changed.length, 0);
// A bot wall (403) is never reported as a broken link.
const walled = await run({ records: [app], fetchImpl: async () => ({ ok: false, status: 403 }), now: 'T1', log: () => {} });
const walled2 = await run({ records: [app], prev: walled, fetchImpl: async () => ({ ok: false, status: 403 }), now: 'T2', log: () => {} });
assert.equal(accessCheck(app, walled2).broken.length, 0);
console.log('All re-check tests passed.');
