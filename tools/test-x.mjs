// Offline tests for X monitoring: no network, X is stubbed. Usage: node tools/test-x.mjs
import assert from 'node:assert/strict';
import { isPraise, isCritical, tone, linksIn, queryFor, summarizeBuzz, run, RULES } from './x.mjs';
for (const t of ['so disappointing', 'it hallucinates a lot', 'overhyped tbh', 'doesn\'t work on my mac', '太失望了', 'ruim demais']) assert.equal(tone(t), 'critical', t);
assert.equal(tone('not bad at all'), 'general'); assert.equal(tone('amazing but buggy'), 'general'); assert.equal(tone('released v2 today'), 'general');

// praise words, other languages, emoji, negation
for (const t of ['This model is amazing', 'Qwen3 is a game changer', 'absolutely blown away', 'رائع جدا', '这个模型太强了', 'すごい速さ', 'increíble modelo', 'love it 🔥', 'beats GPT on my tests']) assert.ok(isPraise(t), t);
for (const t of ['not great at coding', 'this is not amazing', 'released today', 'how do I run this?', 'greatest hits playlist']) assert.ok(!isPraise(t), t);

// links
assert.deepEqual(linksIn(['https://huggingface.co/Qwen/Qwen3-14B', 'https://huggingface.co/datasets/HuggingFaceFW/fineweb', 'https://huggingface.co/spaces/x/y', 'https://huggingface.co/docs/x', 'https://ollama.com/library/qwen3:14b', 'https://example.com']),
  { models: ['Qwen/Qwen3-14B'], datasets: ['HuggingFaceFW/fineweb'], ollama: ['qwen3'] });

// queries
assert.equal(queryFor({ type: 'model', name: 'DeepSeek-R1', distributions: [{ source: 'huggingface', native_id: 'deepseek-ai/DeepSeek-R1' }] }), '("DeepSeek-R1" OR url:"huggingface.co/deepseek-ai/DeepSeek-R1") -is:retweet');
assert.equal(queryFor({ type: 'model', name: 'phi', distributions: [] }), null);
assert.equal(queryFor({ type: 'app', name: 'Claude', access: {} }), '("Claude" (AI OR app)) -is:retweet');

// validation rule
const p = (author, text, likes, reposts = 0) => ({ id: String(Math.random()).slice(2), author, text, likes, reposts, quotes: 0, created_at: '2026-11-14T10:00:00Z', lang: 'en', urls: [] });
let s = summarizeBuzz([p('a', 'amazing', 60), p('b', 'so good', 30), p('c', '🔥🔥', 20), p('d', 'meh', 500)]);
assert.equal(s.praise_posts, 3); assert.equal(s.likes, 110); assert.equal(s.praised, true); assert.equal(s.top.positive.length, 3); assert.ok(!('text' in s.top.all[0]));
assert.equal(s.top.all[0].author, 'd', 'top overall is the most liked, whatever its tone');
s = summarizeBuzz([p('a', 'amazing', 60), p('a', 'so good', 60), p('a', 'wow', 60)]);
assert.equal(s.praised, false, 'one account alone does not validate');

// a full run against a stubbed X: announcements, buzz, budget and rotation
const tweet = (id, user, text, likes, urls = []) => ({ id, author_id: user, text, created_at: '2026-11-14T09:00:00Z', lang: 'en', public_metrics: { like_count: likes, retweet_count: 1, quote_count: 0 }, entities: { urls: urls.map((u) => ({ expanded_url: u })) } });
let calls = 0;
const fetchImpl = async (url) => {
  calls++;
  const q = new URL(url).searchParams.get('query');
  const data = q.includes('url:"huggingface.co" OR') ? [tweet('1', 'u1', 'New model out', 300, ['https://huggingface.co/acme/Acme-7B'])] : [tweet('2', 'u2', 'incredible results', 80), tweet('3', 'u3', 'wow', 40), tweet('4', 'u4', 'best local model', 30), ...[5, 6, 7, 8, 9, 10, 11].map((n) => tweet(String(n), 'u4', 'trying it today', 1))];
  return new Response(JSON.stringify({ data, includes: { users: [{ id: 'u1', username: 'acme' }, { id: 'u2', username: 'bob' }, { id: 'u3', username: 'cat' }, { id: 'u4', username: 'dan' }] } }), { status: 200 });
};
const listings = [1, 2, 3, 4, 5].map((i) => ({ id: `cf:model:x/model-${i}`, type: 'model', name: `Model Number ${i}`, distributions: [] }));
const saved = RULES.monthlyReads; RULES.monthlyReads = 45 * 16; // ~45 reads a day on 2026-11-15 (16 days left incl. today)
const out = await run({ token: 't', fetchImpl, now: new Date('2026-11-15T12:00:00Z'), listings, log: () => {} });
RULES.monthlyReads = saved;
assert.equal(out.data.announcements.length, 1);
assert.deepEqual(out.data.announcements[0].links.models, ['acme/Acme-7B']);
assert.equal(out.data.announcements[0].url, 'https://x.com/acme/status/1');
const checked = Object.keys(out.data.buzz).length;
assert.ok(checked >= 1 && checked < 5, `budget limits listings checked (got ${checked})`);
assert.equal(out.data.buzz['cf:model:x/model-1'].praised, true);
assert.ok(out.state.reads <= 45 && out.state.cursor === checked, 'cursor resumes where budget ran out');

console.log('All X monitoring tests passed.');
