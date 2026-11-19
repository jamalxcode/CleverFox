// Offline test of the status page's "Needs you" list (tools/health.mjs).
import assert from 'node:assert/strict';
import { needsYou, statusPage } from './health.mjs';

const titles = (l) => l.map((n) => n.title);
// Missing keys: from the workflow's true/false flags, or else the source's own "skipped" note.
let l = needsYou({ env: { HAS_REPLICATE_API_TOKEN: 'false', HAS_YOUTUBE_API_KEY: 'true', HAS_PRODUCT_HUNT_TOKEN: 'true', HAS_X_BEARER_TOKEN: 'true' } });
assert.deepEqual(titles(l), ['Add the Replicate token']);
assert.match(l[0].todo, /REPLICATE_API_TOKEN/);
l = needsYou({ disc: { replicate: { skipped: 'no REPLICATE_API_TOKEN' }, youtube: { skipped: [] } } });
assert.deepEqual(titles(l), ['Add the Replicate token']);
// Never a secret value: only names appear.
assert.ok(!JSON.stringify(needsYou({ env: { HAS_REPLICATE_API_TOKEN: 'false', REPLICATE_API_TOKEN: 'r8_secret' } })).includes('r8_secret'));
// Data-driven items.
l = needsYou({
  site: 'https://jamalxcode.github.io/CleverFox/',
  records: [{ type: 'app', name: 'A', verification_status: 'candidate' }, { type: 'app', name: 'B', verification_status: 'verified' },
    { type: 'app', name: 'C', verification_status: 'verified', access_check: { facts: [{ status: 'not_found' }], broken: [] } }],
  quarantine: { records: [{ id: 'cf:app:x/y' }] },
  research: { apps: { 'apple:1': { skipped: 'no website' }, 'apple:2': { skipped: 'already listed (same website)' }, 'apple:3': { record: {} } } },
  disc: { app_store: { apps: [{ id: '1', name: 'Some App' }] } },
  branches: ['main', 'data', 'pages-cache', 'old-work'],
  env: { HAS_AA_API_KEY: 'false', X_POST_ENABLED: '', HAS_X_POST_KEYS: 'true' },
  hand: [{ title: 'Hand item', todo: 'Do it' }, { title: 'Done item', done: true }],
});
assert.deepEqual(titles(l), ['Point cleverfox.sala.company at the site', 'Check 1 apps and hosts at their official pages', 'Re-check 1 listings whose pages no longer show a listed fact', 'Look at 1 records left out by validation', 'Research 1 queued apps by hand', 'Delete 1 old branch', 'Add an Artificial Analysis key', 'Turn on the weekly X post', 'Hand item']);
assert.equal(l.find((n) => n.title.startsWith('Research')).items, 'Some App (no website)');
assert.match(l.find((n) => n.title.startsWith('Turn on')).todo, /^Set the repository variable X_POST_ENABLED/);
assert.deepEqual(l.filter((n) => n.optional).map((n) => n.title.split(' ')[0]), ['Research', 'Add', 'Turn']);
// Nothing set up wrong: an empty list and a calm page.
assert.deepEqual(needsYou({ site: 'https://cleverfox.sala.company/' }), []);
const html = statusPage({ at: new Date().toISOString(), rows: {}, flagged: {}, problems: 0 }, [], new Date(), l);
assert.match(html, /Needs you/); assert.match(html, /1 thing\(s\)|8 thing\(s\)|6 thing\(s\)/);
console.log('health tests passed');
