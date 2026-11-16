// Offline tests for tools/discover.mjs.
import assert from 'node:assert/strict';
import { robotsAllows, releasesFromHtml, GITHUB_QUERIES, feedEntries, youtube, replicate } from './discover.mjs';
import { replicateRecord, replicateMatch, parentsFromMeta, traceOrigin } from './import.mjs';

assert.equal(robotsAllows('', '/'), true, 'no robots.txt: allowed');
assert.equal(robotsAllows('User-agent: *\nDisallow: /', '/'), false);
assert.equal(robotsAllows('User-agent: *\nDisallow: /admin\n', '/'), true);
assert.equal(robotsAllows('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /', '/'), true, 'rules for other bots do not apply');
assert.equal(robotsAllows('User-agent: CleverFox\nDisallow: /', '/'), false, 'rules naming us apply');

const html = `<a href="https://huggingface.co/acme/Acme-9B">Acme 9B</a> <a href="/models/acme">internal</a>
  <a href="https://huggingface.co/datasets/acme/corpus">corpus</a> <a href="https://acme.ai/blog/acme-9b">Acme 9B announcement</a> <a href="#top">top</a>`;
const r = releasesFromHtml(html, 'https://www.llm-releases.com/');
assert.deepEqual(r.hf_models, ['acme/Acme-9B']);
assert.deepEqual(r.hf_datasets, ['acme/corpus']);
assert.deepEqual(r.announcements.map((a) => a.url), ['https://acme.ai/blog/acme-9b'], 'links on the site itself and to the hubs are not announcements');
assert.ok(GITHUB_QUERIES.every((q) => q.q.includes('created:>={since}') && q.q.includes('archived:false')));
// YouTube: feed entries, links in descriptions, channel ids only from the channel's own page.
const entry = (id, title, desc, day) => `<entry><yt:videoId>${id}</yt:videoId><title>${title}</title><link rel="alternate" href="https://www.youtube.com/watch?v=${id}"/><published>${day}T10:00:00+00:00</published><media:description>${desc}</media:description></entry>`;
const v = feedEntries(`<feed>${entry('a1', 'Introducing Acme &amp; co', 'https://huggingface.co/acme/Acme-9B', '2026-11-15')}</feed>`);
assert.equal(v[0].title, 'Introducing Acme & co'); assert.deepEqual(v[0].links.models, ['acme/Acme-9B']);
const yfetch = async (url) => {
  const u = String(url);
  if (u.endsWith('/robots.txt')) return { ok: true, text: async () => 'User-agent: *\nDisallow: /results' };
  if (u.endsWith('/@Real')) return { ok: true, text: async () => '<link rel="canonical" href="https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv">' };
  if (u.endsWith('/@Fake')) return { ok: true, text: async () => '<html>nothing</html>' };
  if (u.includes('feeds/videos.xml')) return { ok: true, text: async () => `<feed>${entry('n1', 'New model', 'https://huggingface.co/datasets/acme/corpus', '2026-11-15')}${entry('o1', 'Old video', '', '2026-09-01')}</feed>` };
  throw new Error('unexpected ' + u);
};
const fs = await import('node:fs'); const path = await import('node:path');
const chFile = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data', 'youtube-channels.json');
const saved = fs.readFileSync(chFile, 'utf8');
try {
  fs.writeFileSync(chFile, JSON.stringify({ channels: [{ handle: '@Real', name: 'Real Lab' }, { handle: '@Fake', name: 'Fake' }] }));
  const y = await youtube({ now: new Date('2026-11-16T00:00:00Z'), fetchImpl: yfetch, key: '' });
  assert.equal(y.channel_ids['@Real'], 'UCabcdefghijklmnopqrstuv');
  assert.ok(!y.channel_ids['@Fake'] && y.skipped.some((s) => s.startsWith('@Fake')), 'unconfirmed handles are skipped');
  assert.deepEqual(y.videos.map((x) => x.id), ['n1'], 'only recent videos');
  assert.deepEqual(y.hf_datasets, ['acme/corpus']);
} finally { fs.writeFileSync(chFile, saved); }
// Replicate: skipped without a token; baseline on the first run; official or used models only; tasks from collections.
const none = await replicate({ token: '' });
assert.equal(none.skipped, 'no REPLICATE_API_TOKEN');
const now = new Date('2026-11-16T00:00:00Z');
const model = (owner, name, o) => ({ owner, name, url: `https://replicate.com/${owner}/${name}`, visibility: 'public', is_official: false, run_count: 0, latest_version: null, description: 'A model.', ...o });
let page = [model('acme', 'acme-video-2', { is_official: true, latest_version: { created_at: '2026-11-14T00:00:00Z' } }),
  model('bob', 'tiny-test', { run_count: 3, latest_version: { created_at: '2026-11-15T00:00:00Z' } }),
  model('carol', 'old-classic', { run_count: 90000, latest_version: { created_at: '2025-01-01T00:00:00Z' } })];
let auth = '';
const rfetch = async (u, o) => {
  auth = o.headers.authorization;
  const json = (d) => ({ ok: true, status: 200, json: async () => d });
  if (u.includes('/v1/models?')) return json({ results: page, next: null });
  if (u.endsWith('/v1/collections')) return json({ results: [{ slug: 'text-to-video' }, { slug: 'fun-stuff' }], next: null });
  if (u.endsWith('/v1/collections/text-to-video')) return json({ models: [{ owner: 'acme', name: 'acme-video-2' }] });
  throw new Error('unexpected ' + u);
};
const r1 = await replicate({ now, fetchImpl: rfetch, token: 't0k' });
assert.equal(auth, 'Bearer t0k');
assert.equal(r1.baseline, true);
assert.deepEqual(r1.models.map((m) => m.id), ['acme/acme-video-2'], 'official and recent only; not unused or old models');
assert.deepEqual(r1.models[0].tasks, ['text-to-video'], 'task from the collection');
assert.equal(r1.first_seen['carol/old-classic'], 'baseline', 'the first run is a baseline');
// Second run: a model never seen before, with runs but no version date, counts as new.
page = [...page, model('dave', 'dave-tts', { run_count: 800 })];
const r2 = await replicate({ now: new Date('2026-11-17T00:00:00Z'), prev: r1, fetchImpl: rfetch, token: 't0k' });
assert.ok(r2.models.some((m) => m.id === 'dave/dave-tts') && !r2.models.some((m) => m.id === 'carol/old-classic'));
// Records: a candidate, nothing invented, matched to the same model listed from Hugging Face.
const rec = replicateRecord(r1.models[0]);
assert.equal(rec.verification_status, 'candidate');
assert.equal(rec.availability.value, 'unknown');
assert.equal(rec.distributions[0].availability, 'api_only');
assert.deepEqual(rec.tasks, ['text-to-video']);
assert.match(rec.description, /^Text-to-video model run by its maker on Replicate/);
const hf = { id: 'x', distributions: [{ source: 'huggingface', native_id: 'Acme-AI/Acme-Video-2' }] };
assert.equal(replicateMatch({ id: 'acme/acme-video-2', owner: 'acme', name: 'acme-video-2' }, [hf]), hf, 'same name, related owner');
assert.equal(replicateMatch({ id: 'zed/acme-video-2', owner: 'zed', name: 'acme-video-2' }, [hf]), undefined, 'same name, unrelated owner');
// Originals: base_model upstream, from tags first, then card metadata; chains stop at an original or an unreadable page.
assert.deepEqual(parentsFromMeta({ id: 'me/q', tags: ['base_model:quantized:me/ft', 'base_model:me/ft'] }), [{ id: 'me/ft', relation: 'quantization_of' }]);
assert.deepEqual(parentsFromMeta({ id: 'me/m', cardData: { base_model: ['a/x', 'b/y'] } }).map((p) => p.id), ['a/x', 'b/y'], 'a merge lists several parents');
const tree = { 'me/ft': [{ id: 'org/base' }], 'org/base': [{ id: 'org/pretrained' }], 'org/pretrained': [] };
assert.deepEqual(traceOrigin('me/ft', (id) => tree[id]), { original: 'org/pretrained', chain: ['me/ft', 'org/base', 'org/pretrained'], complete: true });
assert.equal(traceOrigin('x/gone', () => undefined).complete, false, 'an unreadable page stops the chain');
assert.equal(traceOrigin('a/a', (id) => [{ id: id === 'a/a' ? 'b/b' : 'a/a' }]).chain.length, 2, 'loops stop');
console.log('All discovery tests passed.');
