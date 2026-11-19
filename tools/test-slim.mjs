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
assert.ok(R.verdictStrip(s).includes('Works in'), 'the card shows availability from the App Store');
assert.equal(R.suits(s), 0, 'sorting and highlighting see it as available and payable');
assert.ok(R.priceLine(s.access).includes('399'), 'the price line renders from the list record');
R.view.country = '';

// Models: memory from the parameter count stays marked as an estimate.
const model = { id: 'cf:model:a/b', type: 'model', name: 'B', description: 'x', publisher: 'a', warning: 'none', verification_status: 'verified',
  hardware: { min_memory_gb: 5, recommended_gb: 8, options: [{ label: '7B at 4-bit', memory_gb: 5, basis: 'parameter count (4-bit quantized copy)' }] } };
const sm = slim(model);
assert.equal(sm.hardware.estimate, true);
R.view.mem = 16;
assert.ok(R.verdictStrip(sm).includes('estimate') && !R.verdictStrip(sm).includes('Fits your'), 'an estimate never shows a plain ✓');
R.view.mem = 0;
console.log('All slim-record tests passed.');
// Ways to pay named for other countries don't count for the chosen one (verdicts and "Using it in").
R.setCountries([['KE', 'Kenya'], ['BR', 'Brazil']]);
assert.equal(R.methodFor({ method: 'pix', note: 'Brazil; Go and Plus plans' }, 'KE'), false, 'Pix in Brazil is not a way to pay in Kenya');
assert.equal(R.methodFor({ method: 'pix', note: 'Brazil; Go and Plus plans' }, 'BR'), true);
assert.equal(R.methodFor({ method: 'mobile_money', note: 'M-Pesa' }, 'KE'), true, 'notes without a country count everywhere');
console.log('Payment-country test passed.');
assert.equal(R.methodFor({ method: 'bank_transfer', note: 'Bank debit via Link, UK and EEA where supported' }, 'KE'), false, 'UK and EEA name countries too');
assert.equal(R.methodFor({ method: 'bank_transfer', note: 'Bank debit via Link, UK and EEA where supported' }, 'DE'), true);

// Decision 92: short chips, the "too big for home" verdict, monograms, signals and the list row.
{
  assert.equal(R.shortVerdict('Fits your 8 GB'), 'Fits 8 GB');
  assert.equal(R.shortVerdict('Pay without a card: M-Pesa, Airtel Money'), 'No card needed');
  assert.equal(R.shortVerdict('Custom license with conditions'), 'Custom license');
  assert.ok(R.shortVerdict('Something rather long that nobody mapped to a short label').length <= 26);
  const big = { type: 'model', id: 'cf:model:x/huge', name: 'Huge', publisher: 'x', hardware: { min_memory_gb: 768 }, answers: {} };
  const v = R.verdicts(big)[0];
  assert.equal(v.state, 'no'); assert.match(v.text, /^Too big to run at home/); assert.equal(R.shortVerdict(v.text), 'Server only (768 GB)');
  assert.match(R.verdictChips(big), /class="vh">Too big to run at home/, 'the full sentence stays for screen readers');
  assert.match(R.monogram({ publisher_name: 'Meta Platforms' }), />MP</); assert.match(R.monogram({ publisher: 'openai' }), />OP</);
  const s = R.signals({ type: 'model', signals: { new_at: '2026-11-17T00:00:00Z', trending: true, x: 12, yt: 3 } }, new Date('2026-11-19T12:00:00Z').getTime());
  assert.match(s, /🆕 2d/); assert.match(s, /🔥 trending/); assert.match(s, /💬 12/); assert.match(s, /▶️ 3/);
  assert.equal(R.signals({ type: 'model', signals: { new_at: '2026-11-01T00:00:00Z' } }, new Date('2026-11-19T12:00:00Z').getTime()), '', 'older than a week is not new');
  assert.match(R.listRow({ ...big, popularity: [{ downloads_30d: 1500 }] }), /class="lrow[^"]*".*Huge.*⬇ 1.5K/s);
  console.log('Card and list tests passed.');
}
