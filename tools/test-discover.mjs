// Offline tests for tools/discover.mjs.
import assert from 'node:assert/strict';
import { robotsAllows, releasesFromHtml, GITHUB_QUERIES, feedEntries, youtube, replicate, youtubeReviews, reviewQuery, openrouterNew, feedItems, hfPapers, hackerNews, bluesky, appStoreSpotted } from './discover.mjs';
import { replicateRecord, replicateMatch, parentsFromMeta, traceOrigin, openrouterRecord } from './import.mjs';

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
// YouTube reviews: titles must name the listing; least recently checked first; re-checked after 7 days; quota stops the loop.
assert.equal(reviewQuery({ name: 'Le Chat (Mistral)', publisher: 'Mistral' }), '"Le Chat" review');
assert.equal(reviewQuery({ name: 'Jan', publisher: 'Menlo' }), 'Jan Menlo review', 'short names get the publisher');
const cands = [{ id: 'a', name: 'Acme Chat', publisher: 'Acme' }, { id: 'b', name: 'Bolt', publisher: 'B' }, { id: 'c', name: 'Cora', publisher: 'C' }];
const seenQ = [];
const vfetch = async (u) => {
  const q = decodeURIComponent(u.match(/q=([^&]+)/)[1]); seenQ.push(q);
  return { ok: true, json: async () => ({ items: [{ id: { videoId: 'v1aaaaaaaaa' }, snippet: { title: 'Acme Chat review: is it worth it?', channelTitle: 'Rev', publishedAt: '2026-11-01T00:00:00Z' } }, { id: { videoId: 'v2bbbbbbbbb' }, snippet: { title: 'Unrelated video', channelTitle: 'X', publishedAt: '2026-11-01T00:00:00Z' } }] }) };
};
const rv = await youtubeReviews({ now, prev: { c: { checked_at: '2026-11-15T00:00:00Z', videos: [] } }, fetchImpl: vfetch, key: 'k', candidates: cands });
assert.deepEqual(seenQ, ['"Acme Chat" review', 'Bolt B review'], 'recently checked listings wait');
assert.deepEqual(rv.a.videos.map((v) => v.id), ['v1aaaaaaaaa'], 'only titles naming the listing');
assert.deepEqual(rv.b.videos, []);
let calls = 0;
await youtubeReviews({ now, fetchImpl: async () => { calls++; return { ok: false, status: 403 }; }, key: 'k', candidates: cands });
assert.equal(calls, 1, 'quota errors stop the loop');
// ---- No-sign-up sources (decision 83) ----
const N = new Date('2026-11-17T12:00:00Z'); const sec = (iso) => Math.floor(new Date(iso) / 1000);
const json = (d, status = 200) => ({ ok: status < 400, status, json: async () => d, text: async () => JSON.stringify(d) });
// OpenRouter: only models created in the last 14 days, no ":free" duplicates, prices per million tokens, tasks from modalities.
const orl = openrouterNew([
  { id: 'acme/acme-7', name: 'Acme: Acme 7', created: sec('2026-11-15T00:00:00Z'), pricing: { prompt: '0.000002', completion: '0.00001' }, context_length: 128000, architecture: { input_modalities: ['text', 'image'] } },
  { id: 'acme/acme-7:free', name: 'Acme 7 (free)', created: sec('2026-11-15T00:00:00Z') },
  { id: 'acme/acme-7:batch', name: 'Acme 7 (batch)', created: sec('2026-11-15T00:00:00Z') },
  { id: 'openrouter/auto', name: 'Auto Router', created: sec('2026-11-15T00:00:00Z') },
  { id: 'old/model', name: 'Old', created: sec('2025-01-01T00:00:00Z') },
  { id: 'meta/llama-9', name: 'Meta: Llama 9', created: sec('2026-11-16T00:00:00Z'), hugging_face_id: 'meta-llama/Llama-9' }], N);
assert.deepEqual(orl.map((m) => m.id), ['acme/acme-7', 'meta/llama-9']);
assert.equal(orl[0].name, 'Acme 7'); assert.equal(orl[0].input, 2); assert.equal(orl[0].output, 10); assert.deepEqual(orl[0].tasks, ['image-text-to-text']);
const orr = openrouterRecord(orl[0]);
assert.equal(orr.verification_status, 'candidate'); assert.equal(orr.distributions[0].access.free.value, 'paid_only', 'free or paid from OpenRouter prices'); assert.equal(orr.distributions[0].access.payment_methods.value, 'unknown'); assert.equal(orr.availability.value, 'unknown'); assert.equal(orr.distributions[0].source, 'aggregator');
assert.match(orr.description, /^Vision-language model by acme, available through OpenRouter/);
assert.ok(replicateMatch({ id: 'anthropic/claude-x-2', owner: 'anthropic', name: 'Claude X 2' }, [{ name: 'Claude X 2', publisher: 'Anthropic', distributions: [{ source: 'api', native_id: 'claude-x-2' }] }]), 'matches a hand-researched listing by name and maker');
// Feeds: RSS and Atom, CDATA, dates.
const rss = `<rss><channel><item><title><![CDATA[Introducing Acme 7]]></title><link>https://acme.ai/news/acme-7</link><pubDate>Mon, 16 Nov 2026 10:00:00 GMT</pubDate><description><![CDATA[Weights: https://huggingface.co/acme/Acme-7]]></description></item></channel></rss>`;
const atom = `<feed><entry><title>Old post</title><link href="https://acme.ai/old"/><updated>2026-01-01T00:00:00Z</updated></entry></feed>`;
const fi = feedItems(rss);
assert.equal(fi[0].title, 'Introducing Acme 7'); assert.equal(fi[0].published_at, '2026-11-16T10:00:00.000Z'); assert.ok(fi[0].text.includes('huggingface.co/acme/Acme-7'));
assert.equal(feedItems(atom)[0].url, 'https://acme.ai/old');
// Daily Papers: top papers and their repos.
const pp = await hfPapers({ now: N, fetchImpl: async (u) => u.includes('daily_papers') ? json([{ paper: { id: '2611.1', title: 'P1', upvotes: 50 } }, { paper: { id: '2611.2', title: 'P2', upvotes: 5 } }]) : u.includes('2611.1') ? json({ models: [{ id: 'lab/m1' }, { id: 'lab/m2' }, { id: 'x/lora' }], datasets: [{ id: 'lab/d1' }] }) : json({ models: [], datasets: [] }) });
assert.deepEqual(pp.hf_models, ['lab/m1', 'lab/m2'], 'two models per paper at most'); assert.deepEqual(pp.hf_datasets, ['lab/d1']);
// Hacker News: launches with their site and Hugging Face links.
const hn = await hackerNews({ now: N, fetchImpl: async () => json({ hits: [{ objectID: '1', title: 'Show HN: Acme app', url: 'https://www.acme.app/', points: 120, created_at: '2026-11-16T00:00:00Z' }, { objectID: '2', title: 'Weights out', url: 'https://huggingface.co/acme/Acme-7', points: 80 }] }) });
assert.equal(hn.launches[0].site, 'acme.app'); assert.deepEqual(hn.hf_models, ['acme/Acme-7']);
// Bluesky: skipped (not failed) when its search needs signing in.
const bs = await bluesky({ now: N, fetchImpl: async () => json({}, 403) });
assert.equal(bs.skipped, 'Bluesky search needs signing in');
// App Store: popular apps that aren't listed; known ids and names skipped; once a day.
const apps = await appStoreSpotted({ now: N, countries: ['KE', 'NG'], pause: 0, known: { ids: new Set(['111']), names: new Set(['chatgpt']) }, fetchImpl: async () => json({ results: [
  { trackId: 111, trackName: 'Known App', userRatingCount: 9000 }, { trackId: 222, trackName: 'ChatGPT', userRatingCount: 9000 },
  { trackId: 333, trackName: 'Newcomer AI', sellerName: 'New Co', averageUserRating: 4.62, userRatingCount: 5000, trackViewUrl: 'https://apps.apple.com/app/id333?uo=4' },
  { trackId: 444, trackName: 'Tiny AI', userRatingCount: 10 }] }) });
assert.deepEqual(apps.apps.map((a) => a.id), ['333']); assert.deepEqual(apps.apps[0].countries, ['KE', 'NG']); assert.equal(apps.apps[0].url, 'https://apps.apple.com/app/id333');
const again = await appStoreSpotted({ now: new Date('2026-11-17T18:00:00Z'), prev: apps, fetchImpl: async () => { throw new Error('should not fetch'); } });
assert.equal(again, apps, 'checked once a day');
console.log('All discovery tests passed.');
// A source whose every request fails throws, so the last data is kept instead of being replaced by an empty list.
await assert.rejects(hackerNews({ now: N, fetchImpl: async () => { throw new Error('offline'); } }), /every Hacker News search failed/);
await assert.rejects(appStoreSpotted({ now: N, countries: ['KE'], pause: 0, known: { ids: new Set(), names: new Set() }, fetchImpl: async () => { throw new Error('offline'); } }), /every App Store search failed/);
console.log('Failure-keeps-last-data tests passed.');
