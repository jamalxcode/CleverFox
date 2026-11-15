// Offline tests for tools/recheck.mjs (no network).
import assert from 'node:assert/strict';
import { watchUrls, fingerprint, update, run, accessCheck, termsIn } from './recheck.mjs';

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
// Fact checks: words on the page confirm payment methods and free status.
assert.deepEqual(termsIn('pay with m-pesa or paypal. free plan'), ['paypal', 'mobile_money', 'free']);
assert.deepEqual(termsIn('支付宝和微信支付'), ['alipay', 'wechat_pay']);
assert.ok(!termsIn('sunupia mapix').includes('upi') && !termsIn('sunupia mapix').includes('pix'), 'whole words only for short terms');
const pm = (methods, u) => ({ value: methods.map((m) => ({ method: m })), source_url: u, source_type: 'official', observed_at: '2026-11-14T00:00:00Z' });
const appF = { type: 'app', access: { free: { value: 'free_tier', source_url: 'https://f.example/p', observed_at: '2026-11-14T00:00:00Z' }, payment_methods: pm(['mobile_money', 'paypal', 'other'], 'https://f.example/p') } };
const pages2 = { 'https://f.example/p': '<p>Plans: free tier. Pay with M-Pesa. </p>'.repeat(40) };
const f2 = async (u) => ({ ok: true, status: 200, text: async () => pages2[u] });
const d2 = await run({ records: [appF], fetchImpl: f2, now: '2026-11-15T00:00:00Z', log: () => {} });
const facts = accessCheck(appF, d2).facts;
const pmFact = facts.find((f) => f.field === 'payment_methods');
assert.deepEqual(pmFact.want, ['mobile_money', 'paypal'], '"other" is not checkable');
assert.equal(pmFact.status, 'partly'); assert.deepEqual(pmFact.missing, ['paypal']);
assert.equal(facts.find((f) => f.field === 'free').status, 'confirmed');
console.log('All re-check tests passed.');
