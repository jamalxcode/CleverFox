// The list records the browser loads must keep what the page shows (decision 66): build a slim app and a slim
// model and read them back with the same render functions the page uses.
import assert from 'node:assert/strict';
import { slim } from './slim.mjs';
import * as R from '../render.js';

const claim = (value, u = 'https://app.example/pricing') => ({ value, source_url: u, source_type: 'official', observed_at: '2026-11-15T00:00:00Z' });
const app = {
  id: 'cf:app:example/app', type: 'app', name: 'Example', description: 'x', publisher: 'Example Inc', verification_status: 'verified', warning: 'none',
  research_notes: 'internal', evidence_urls: ['https://app.example/'], answers: { good_for: ['chat'], free: 'free_tier', pay_without_card: true },
  app_store_urls: ['https://apps.apple.com/us/app/example/id1', 'https://play.google.com/store/apps/details?id=x.y'],
  access: {
    free: claim('free_tier'), countries_available: { value: 'unknown', source_url: null, source_type: null, observed_at: '2026-11-15T00:00:00Z' },
    payment_methods: { ...claim([{ method: 'upi', note: 'India only' }, { method: 'card_international' }]) },
    app_store_countries: { value: ['KE', 'IN'], checked: 50, source_url: 'https://itunes.apple.com/lookup?id=1', source_type: 'official', observed_at: '2026-11-15T00:00:00Z' },
    prices: [{ plan: 'Pro', amount: 399, currency: 'INR', period: 'month', country: 'IN', source_url: 'https://app.example/pricing', source_type: 'official', observed_at: '2026-11-15T00:00:00Z' }],
  },
};
const s = JSON.parse(JSON.stringify(slim(app))); // as fetched by the browser
assert.equal(s.research_notes, undefined, 'internal notes never published in the list');
assert.equal(s.access.payment_methods.value[0].note, 'India only', 'payment notes survive');
assert.equal(s.access.payment_methods.source_url, 'https://app.example/pricing', 'sources survive');
assert.equal(s.access.prices[0].amount, 399, 'prices survive');
assert.equal(R.availableIn(s.access, 'KE'), 'yes', 'App Store countries reach the country badge');
R.view.country = 'KE';
assert.ok(R.cardBadges(s).includes('Available in'), 'the card shows availability from the App Store');
assert.equal(R.suits(s), 0, 'sorting and highlighting see it as available and payable');
assert.ok(R.priceLine(s.access).includes('399'), 'the price line renders from the list record');
R.view.country = '';

// Models: memory from the parameter count stays marked as an estimate.
const model = { id: 'cf:model:a/b', type: 'model', name: 'B', description: 'x', publisher: 'a', warning: 'none', verification_status: 'verified',
  hardware: { min_memory_gb: 5, recommended_gb: 8, options: [{ label: '7B at 4-bit', memory_gb: 5, basis: 'parameter count (4-bit quantized copy)' }] } };
const sm = slim(model);
assert.equal(sm.hardware.estimate, true);
R.view.mem = 16;
assert.ok(R.cardBadges(sm).includes('estimate') && !R.cardBadges(sm).includes('✓ Fits'), 'an estimate never shows a plain ✓');
R.view.mem = 0;
console.log('All slim-record tests passed.');
