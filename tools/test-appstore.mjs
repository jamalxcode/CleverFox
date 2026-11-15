// Offline tests for tools/appstore.mjs (stubbed Apple APIs).
import assert from 'node:assert/strict';
import { sellerMatches, brandOf, run, RULES } from './appstore.mjs';

assert.ok(sellerMatches('OpenAI OpenAI, L.L.C.', ['OpenAI OpenAI, L.L.C.', 'OpenAI']));
assert.ok(sellerMatches('Anthropic PBC', [null, 'Anthropic']));
assert.ok(!sellerMatches('Chat Smith Apps LLC', ['OpenAI OpenAI, L.L.C.', 'OpenAI']));
assert.ok(!sellerMatches('AI Technology Ltd', ['Anthropic PBC']), 'generic words never match');
assert.equal(brandOf('Doubao (豆包)'), 'Doubao');
assert.equal(brandOf('Microsoft Copilot'), 'Microsoft');

RULES.countriesPerRun = 3; RULES.brandsPerRun = 2;
const apps = [
  { id: 'cf:app:openai/chatgpt', name: 'ChatGPT', apple_id: 1, store: 'us', expected: ['OpenAI OpenAI, L.L.C.', 'OpenAI'] },
  { id: 'cf:app:x/fake', name: 'Fakeapp', apple_id: 2, store: 'us', expected: [null, 'Real Company'] },
  { id: 'cf:app:x/gone', name: 'Goneapp', apple_id: 3, store: 'us', expected: [null, 'Gone Inc'] },
];
const fetchImpl = async (url) => {
  const u = new URL(url); const cc = u.searchParams.get('country');
  if (u.pathname === '/lookup') {
    const ids = u.searchParams.get('id').split(',').map(Number);
    const all = { 1: { trackId: 1, trackName: 'ChatGPT', sellerName: 'OpenAI OpenAI, L.L.C.', trackViewUrl: 'https://apps.apple.com/us/app/chatgpt/id1?uo=4', averageUserRating: 4.79, userRatingCount: 1000 },
      2: { trackId: 2, trackName: 'Fakeapp', sellerName: 'Someone Else LLC' } };
    const results = ids.filter((i) => all[i] && !(i === 1 && cc === 'cn')).map((i) => all[i]);
    return { ok: true, status: 200, json: async () => ({ results }) };
  }
  return { ok: true, status: 200, json: async () => ({ results: [
    { trackId: 1, trackName: 'ChatGPT', sellerName: 'OpenAI OpenAI, L.L.C.' }, { trackId: 9, trackName: 'Chat AI - ChatGPT assistant', sellerName: 'Chat Smith' },
    { trackId: 10, trackName: 'Notes', sellerName: 'X' }] }) };
};
const out = await run({ apps, fetchImpl, sleep: async () => {}, log: () => {}, now: 'T1', prev: { cursor: { country: 0, brand: 0 } } });
assert.equal(out.apps['cf:app:openai/chatgpt'].apple.confirmed, true);
assert.equal(out.apps['cf:app:openai/chatgpt'].apple.url, 'https://apps.apple.com/us/app/chatgpt/id1');
assert.equal(out.apps['cf:app:x/fake'].apple.confirmed, false, 'seller mismatch is rejected');
assert.equal(out.apps['cf:app:x/gone'].apple.found, false);
assert.deepEqual(out.apps['cf:app:openai/chatgpt'].countries, { AE: true, AF: true, AG: true });
assert.equal(out.apps['cf:app:x/fake'].countries, undefined, 'unconfirmed apps are never checked further');
assert.equal(out.cursor.country, 3);
assert.equal(out.apps['cf:app:openai/chatgpt'].lookalikes.count, 1);
// Rate-limited: stops early instead of waiting for ever, and keeps earlier data.
let calls = 0;
const limitedOut = await run({ apps, fetchImpl: async () => { calls++; return { ok: false, status: 429 }; }, sleep: async () => {}, log: () => {}, now: 'T2', prev: out });
assert.ok(calls <= 3, `stopped after ${calls} calls`);
assert.equal(limitedOut.apps['cf:app:openai/chatgpt'].apple.confirmed, true, 'earlier confirmation kept');
console.log('All App Store tests passed.');
