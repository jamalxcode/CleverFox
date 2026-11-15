// Offline tests for tools/discover.mjs.
import assert from 'node:assert/strict';
import { robotsAllows, releasesFromHtml, GITHUB_QUERIES } from './discover.mjs';

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
console.log('All discovery tests passed.');
