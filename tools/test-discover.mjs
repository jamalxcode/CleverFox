// Offline tests for tools/discover.mjs.
import assert from 'node:assert/strict';
import { robotsAllows, releasesFromHtml, GITHUB_QUERIES, feedEntries, youtube } from './discover.mjs';

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
console.log('All discovery tests passed.');
