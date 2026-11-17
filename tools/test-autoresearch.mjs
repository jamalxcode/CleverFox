// Offline tests for tools/autoresearch.mjs: facts only from official pages, each with its quote; nothing guessed.
import assert from 'node:assert/strict';
import { extractFacts, billingLinks, visibleText, quoteAround, research, queueFrom, appRecord } from './autoresearch.mjs';

// Rules: a free plan, ways to pay only on pricing/billing pages, sign-up methods; download badges don't count.
const home = { url: 'https://acme.ai/', billing: false, text: visibleText('<h1>Acme AI</h1><p>Start for free today. Download on the App Store and Google Play.</p><p>Sign up with Google or email in seconds.</p>') };
const pricing = { url: 'https://acme.ai/pricing', billing: true, text: visibleText('<h2>Plans</h2><p>Pro is $9 a month. We accept Visa, Mastercard and PayPal. In Kenya you can pay with M-Pesa.</p>') };
const f = extractFacts([home, pricing]);
assert.equal(f.free.value, 'free_tier'); assert.match(f.free.quote, /Start for free/); assert.equal(f.free.url, 'https://acme.ai/');
assert.deepEqual(f.payment_methods.map((m) => m.method).sort(), ['card_international', 'mobile_money', 'paypal']);
assert.ok(f.payment_methods.every((m) => m.url === 'https://acme.ai/pricing'), 'ways to pay come from the pricing page');
assert.ok(!f.payment_methods.some((m) => m.method === 'app_store_billing'), 'a download badge is not a way to pay');
assert.match(f.signup.value, /Sign up with Google/);
assert.equal(extractFacts([{ url: 'x', billing: true, text: 'Nothing about money here.' }]).free, null, 'silence stays unknown');
assert.equal(extractFacts([{ url: 'x', billing: true, text: 'Try it with our 7-day trial.' }]).free.value, 'trial');
// Short words match whole words only ("pix" is not in "pixel").
assert.equal(extractFacts([{ url: 'x', billing: true, text: 'Crisp pixel-perfect images.' }]).payment_methods.length, 0);
assert.ok(quoteAround('One. Two has PayPal here. Three.', /paypal/i).includes('Two has PayPal here.'));

// Links to pricing / plans / FAQ pages on the same site, pricing first.
const links = billingLinks('<a href="/blog">Blog</a><a href="/faq">FAQ</a><a href="/pricing">Pricing</a><a href="https://other.com/pricing">x</a>', 'https://acme.ai/');
assert.deepEqual(links, ['https://acme.ai/pricing', 'https://acme.ai/faq']);

// A whole run: App Store lookup, the website (robots.txt respected), a candidate listing with quotes.
const pages = {
  'https://acme.ai/robots.txt': 'User-agent: *\nDisallow: /private',
  'https://acme.ai/': '<a href="/pricing">Pricing</a><p>Free forever for personal use.</p>',
  'https://acme.ai/pricing': '<p>Pay with UPI or credit card. Billed monthly.</p>',
};
const fetchImpl = async (u) => {
  if (u.startsWith('https://itunes.apple.com/lookup')) return { ok: true, json: async () => ({ results: [{ trackId: 555, trackName: 'Acme AI - Chat Assistant', sellerName: 'Acme Labs Inc.', trackViewUrl: 'https://apps.apple.com/us/app/acme/id555?uo=4', sellerUrl: 'https://acme.ai/', price: 0, formattedPrice: 'Free', description: 'Acme answers questions. More text.', languageCodesISO2A: ['EN', 'SW'] }] }) };
  if (u in pages) return { ok: true, status: 200, url: u, text: async () => pages[u] };
  return { ok: false, status: 404, text: async () => '' };
};
const disc = { app_store: { checked_at: '2026-11-17T00:00:00Z', apps: [{ id: '555', name: 'Acme AI', seller: 'Acme Labs Inc.', url: 'https://apps.apple.com/app/id555' }, { id: '777', name: 'ChatGPT', seller: 'OpenAI' }] } };
const { records, state } = await research({ queue: queueFrom(disc), known: (a) => a.name === 'ChatGPT', fetchImpl, now: '2026-11-17T10:00:00Z', log: () => {} });
assert.equal(records.length, 1, 'already-listed apps are skipped');
const r = records[0];
assert.equal(r.id, 'cf:app:acme-labs-inc/acme-ai'); assert.equal(r.name, 'Acme AI'); assert.equal(r.verification_status, 'candidate');
assert.equal(r.access.free.value, 'free_tier'); assert.equal(r.access.free.source_url, 'https://acme.ai/');
assert.deepEqual(r.access.payment_methods.value.map((m) => m.method).sort(), ['card_international', 'upi']);
assert.equal(r.access.countries_available.value, 'unknown', 'countries never come from a website\'s silence');
assert.deepEqual(r.interface_languages.value, ['en', 'sw']); assert.equal(r.store_price.free_download, true);
assert.equal(r.app_store_urls[0], 'https://apps.apple.com/us/app/acme/id555');
assert.ok(r.research.quotes.length >= 3 && r.research.quotes.every((q) => q.quote && q.url), 'every fact keeps its quote and page');
// Not researched again within 14 days.
const again = await research({ queue: queueFrom(disc), known: () => false, prev: state, fetchImpl: async () => { throw new Error('should not fetch'); }, now: '2026-11-20T10:00:00Z', log: () => {} });
assert.equal(again.records.length, 1);
// A robots.txt refusal is respected: nothing read from that site.
const blocked = await research({ queue: [{ key: 'ph:x', from: 'product_hunt', name: 'Blocked', website: 'https://blocked.ai/' }], known: () => false, fetchImpl: async (u) => u.endsWith('robots.txt') ? { ok: true, text: async () => 'User-agent: *\nDisallow: /' } : { ok: true, url: u, text: async () => '<p>Free plan</p>' }, now: '2026-11-17T10:00:00Z', log: () => {} });
assert.equal(blocked.records.length, 0); assert.equal(blocked.state.apps['ph:x'].skipped, 'website not readable');
// Records from a Product Hunt launch use its tagline.
const ph = appRecord({ app: { name: 'Zed', tagline: 'Chat with your files', from: 'product_hunt', source_url: 'https://www.producthunt.com/posts/zed' }, store: null, site: 'https://zed.app/', pages: [], facts: { free: null, payment_methods: [], signup: null }, now: '2026-11-17T10:00:00Z' });
assert.match(ph.description, /^AI app from zed\.app: Chat with your files\./); assert.equal(ph.publisher, 'zed.app'); assert.equal(ph.discovered_via.source, 'product-hunt');
assert.deepEqual(r.categories, ['chat'], 'categories from the publisher\'s own words'); // "Chat Assistant", "answers questions"
const { categoriesOf } = await import('./autoresearch.mjs');
assert.deepEqual(categoriesOf('Turn meetings into slides'), ['other']); assert.deepEqual(categoriesOf('Voice notes to text, translated'), ['audio', 'translation']);
// Long seller names still fit the 30-word limit; an app on an already-listed website is skipped.
const long = appRecord({ app: { name: 'X', from: 'app_store' }, store: { trackName: 'Chat AI', sellerName: 'Appnation Yazilim Hizmetleri Ticaret Anonim Sirketi Global Software Holdings', description: Array(60).fill('word').join(' ') + '.', lookup: 'l' }, site: null, pages: [], facts: { free: null, payment_methods: [], signup: null }, now: '2026-11-17T10:00:00Z' });
assert.ok(long.description.split(/\s+/).length <= 30, 'descriptions fit 30 words');
const dup = await research({ queue: [{ key: 'apple:9', from: 'app_store', apple_id: 9, name: 'Google Gemini' }], known: Object.assign(() => false, { site: (u) => /gemini\.google\.com/.test(u) }), log: () => {}, now: '2026-11-17T10:00:00Z',
  fetchImpl: async (u) => u.includes('itunes') ? { ok: true, json: async () => ({ results: [{ trackId: 9, trackName: 'Google Gemini', sellerName: 'Google LLC', sellerUrl: 'https://gemini.google.com/' }] }) } : { ok: false, status: 404 } });
assert.equal(dup.records.length, 0); assert.match(dup.state.apps['apple:9'].skipped, /already listed/);
// Apple's app page: in-app purchases become "app store billing", quoted with the plans and prices.
const { inAppPurchases } = await import('./autoresearch.mjs');
const iap = inAppPurchases('Ratings 4.7 In-App Purchases Pro Weekly $6.99 Pro Yearly $49.99 Lifetime $99.99 Privacy');
assert.deepEqual(iap.items, ['Pro Weekly $6.99', 'Pro Yearly $49.99', 'Lifetime $99.99']);
assert.equal(inAppPurchases('A free app with no purchases.'), null);
const withIap = await research({ queue: [{ key: 'apple:42', from: 'app_store', apple_id: 42, name: 'Zap' }], known: () => false, log: () => {}, now: '2026-11-17T10:00:00Z',
  fetchImpl: async (u) => u.includes('itunes') ? { ok: true, json: async () => ({ results: [{ trackId: 42, trackName: 'Zap AI', sellerName: 'Zap Co', trackViewUrl: 'https://apps.apple.com/us/app/zap/id42', price: 0 }] }) }
    : u.endsWith('robots.txt') ? { ok: true, text: async () => '' } : { ok: true, url: u, text: async () => '<div>In-App Purchases</div><li>Zap Pro Monthly $9.99</li>' } });
assert.deepEqual(withIap.records[0].access.payment_methods.value.map((m) => m.method), ['app_store_billing']);
assert.match(withIap.records[0].access.payment_methods.value[0].note, /Zap Pro Monthly \$9\.99/);
console.log('All auto-research tests passed.');
