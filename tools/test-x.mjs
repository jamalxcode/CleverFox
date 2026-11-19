// Offline tests for X monitoring: no network, X is stubbed. Usage: node tools/test-x.mjs
import assert from 'node:assert/strict';
import { isPraise, isCritical, tone, linksIn, queryFor, shortName, summarizeBuzz, run, RULES } from './x.mjs';
for (const t of ['so disappointing', 'it hallucinates a lot', 'overhyped tbh', 'doesn\'t work on my mac', '太失望了', 'ruim demais']) assert.equal(tone(t), 'critical', t);
assert.equal(tone('not bad at all'), 'general'); assert.equal(tone('amazing but buggy'), 'general'); assert.equal(tone('released v2 today'), 'general');

// praise words, other languages, emoji, negation
for (const t of ['This model is amazing', 'Qwen3 is a game changer', 'absolutely blown away', 'رائع جدا', '这个模型太强了', 'すごい速さ', 'increíble modelo', 'love it 🔥', 'beats GPT on my tests', '这个模型牛逼']) assert.ok(isPraise(t), t);
for (const t of ['not great at coding', 'this is not amazing', 'released today', 'how do I run this?', 'greatest hits playlist', '🔥🔥🔥', '❤️', '牛肉面 recipe', '我吃了牛']) assert.ok(!isPraise(t), t);

// links
assert.deepEqual(linksIn(['https://huggingface.co/Qwen/Qwen3-14B', 'https://huggingface.co/datasets/HuggingFaceFW/fineweb', 'https://huggingface.co/spaces/x/y', 'https://huggingface.co/docs/x', 'https://ollama.com/library/qwen3:14b', 'https://example.com']),
  { models: ['Qwen/Qwen3-14B'], datasets: ['HuggingFaceFW/fineweb'], ollama: ['qwen3'], sites: ['example.com'] });
assert.deepEqual(linksIn(['https://x.com/a/status/1', 'https://www.youtube.com/watch?v=1', 'https://www.newapp.ai/launch']).sites, ['newapp.ai'], 'social sites are not launches');

// queries
assert.equal(queryFor({ type: 'model', name: 'DeepSeek-R1', distributions: [{ source: 'huggingface', native_id: 'deepseek-ai/DeepSeek-R1' }] }), '("DeepSeek-R1" OR url:"huggingface.co/deepseek-ai/DeepSeek-R1") -is:retweet');
assert.equal(queryFor({ type: 'model', name: 'phi', distributions: [] }), null);
// Short names: what people write on X
const sn = (name, extra = {}) => shortName({ type: 'model', name, relations: [], ...extra });
assert.equal(sn('Llama 4 Scout 17B-16E Instruct'), 'Llama 4 Scout');
assert.equal(sn('Falcon-H1-7B-Instruct'), 'Falcon H1');
assert.equal(sn('Mistral Small 4 (119B, 2603)'), null); // already short once the brackets go
assert.equal(sn('EXAONE 4.5 33B'), 'EXAONE 4.5');
assert.equal(sn('Gemma 4 12B IT'), 'Gemma 4');
assert.equal(sn('gpt-oss-20b'), 'gpt oss');
assert.equal(sn('Nemotron-SEA-LION-v4.8-30B-A3B'), 'Nemotron SEA LION v4.8');
assert.equal(sn('DeepSeek-V4.1-Flash'), null); // versions stay: already short
assert.equal(sn('Qwen3.8-27B'), 'Qwen3.8');
assert.equal(sn('Qwen3-Swallow-8B-RL v0.2'), 'Qwen3 Swallow');
assert.equal(sn('InkubaLM-0.4B'), null);
assert.equal(sn('Qwen3.8-27B-Longbook27-v2'), null); // a fine-tune, not Qwen3.8 itself
assert.equal(sn('Sarvam-30B'), null); // bare brand
assert.equal(sn('Jais-3-7B'), 'Jais 3');
assert.equal(sn('Kimi K3'), null);
assert.equal(sn('Phi-4'), null);
assert.equal(sn('Qwen3.8-27B-Heretic-Abliterated-Uncensored-GGUF'), null); // derivative
assert.equal(sn('Some-Model-7B', { relations: [{ type: 'finetune_of', target: 'x' }] }), null);
assert.equal(queryFor({ type: 'model', name: 'Llama 4 Scout 17B-16E Instruct', relations: [], distributions: [{ source: 'huggingface', native_id: 'meta-llama/Llama-4-Scout-17B-16E-Instruct' }] }),
  '("Llama 4 Scout 17B-16E Instruct" OR "Llama 4 Scout" OR url:"huggingface.co/meta-llama/Llama-4-Scout-17B-16E-Instruct") -is:retweet');
assert.equal(queryFor({ type: 'app', name: 'Claude', access: {} }), '("Claude" (AI OR app)) -is:retweet');

// validation rule
const p = (author, text, likes, reposts = 0) => ({ id: String(Math.random()).slice(2), author, text, likes, reposts, quotes: 0, created_at: '2026-11-14T10:00:00Z', lang: 'en', urls: [] });
let s = summarizeBuzz([p('a', 'amazing', 60), p('b', 'so good', 30), p('c', '🔥🔥', 20), p('d', 'meh', 500), p('e', 'impressive', 60), p('f', 'excellent', 40), p('a', 'really good', 30)]);
assert.equal(s.praise_posts, 5, 'emoji alone are not praise'); assert.equal(s.likes, 220); assert.equal(s.praised, true); assert.equal(s.top.positive.length, 3); assert.ok(!('text' in s.top.all[0]));
assert.equal(summarizeBuzz([p('a', 'amazing', 60), p('b', 'so good', 60), p('c', 'great', 60)]).praised, false, 'three posts are not enough');
assert.equal(s.top.all[0].author, 'd', 'top overall is the most liked, whatever its tone');
s = summarizeBuzz([p('a', 'amazing', 60), p('a', 'so good', 60), p('a', 'wow', 60)]);
assert.equal(s.praised, false, 'one account alone does not validate');

// a full run against a stubbed X: announcements, buzz, budget and rotation
const tweet = (id, user, text, likes, urls = []) => ({ id, author_id: user, text, created_at: '2026-11-14T09:00:00Z', lang: 'en', public_metrics: { like_count: likes, retweet_count: 1, quote_count: 0 }, entities: { urls: urls.map((u) => ({ expanded_url: u })) } });
let calls = 0;
const fetchImpl = async (url) => {
  calls++;
  const q = new URL(url).searchParams.get('query');
  const data = q.includes('url:"huggingface.co" OR') ? [tweet('1', 'u1', 'New model out', 300, ['https://huggingface.co/acme/Acme-7B'])] : [tweet('2', 'u2', 'incredible results', 80), tweet('3', 'u3', 'wow', 60), tweet('4', 'u4', 'best local model', 40), tweet('5', 'u5', 'really good', 30), tweet('6', 'u2', 'impressive', 20), ...[7, 8, 9, 10, 11].map((n) => tweet(String(n), 'u4', 'trying it today', 1))];
  return new Response(JSON.stringify({ data, includes: { users: [{ id: 'u1', username: 'acme' }, { id: 'u2', username: 'bob' }, { id: 'u3', username: 'cat' }, { id: 'u4', username: 'dan' }, { id: 'u5', username: 'eve' }] } }), { status: 200 });
};
const listings = [1, 2, 3, 4, 5].map((i) => ({ id: `cf:model:x/model-${i}`, type: 'model', name: `Model Number ${i}`, distributions: [] }));
const saved = RULES.monthlyReads; RULES.monthlyReads = 45 * 16; // ~45 reads a day on 2026-11-15 (16 days left incl. today)
const out = await run({ token: 't', fetchImpl, now: new Date('2026-11-15T12:00:00Z'), listings, log: () => {} });
RULES.monthlyReads = saved;
assert.equal(out.data.announcements.length, 1);
assert.deepEqual(out.data.announcements[0].links.models, ['acme/Acme-7B']);
assert.equal(out.data.announcements[0].url, 'https://x.com/i/status/1');
const checked = Object.keys(out.data.buzz).length;
assert.ok(checked >= 1 && checked < 5, `budget limits listings checked (got ${checked})`);
assert.equal(out.data.buzz['cf:model:x/model-1'].praised, true);
assert.ok(out.state.reads <= 45 && out.state.cursor === checked, 'cursor resumes where budget ran out');

// Same day, an hour later: no announcement scan (under 5 hours), no listing re-read, never past the day's share.
RULES.monthlyReads = 45 * 16; calls = 0;
const again = await run({ token: 't', fetchImpl, now: new Date('2026-11-15T13:00:00Z'), listings, prev: out.data, state: out.state, log: () => {} });
assert.equal(again.state.scans, 1, 'no second announcement scan within 5 hours');
for (const id of Object.keys(out.data.buzz)) assert.equal(again.data.buzz[id].observed_at, out.data.buzz[id].observed_at, `${id} is not re-read the same day`);
assert.ok(again.state.day_reads <= again.state.day_share, 'within the day\'s share');
// Next day: new share; listings read in the last 24 hours are skipped, so the rotation moves on.
calls = 0;
const next = await run({ token: 't', fetchImpl, now: new Date('2026-11-16T06:00:00Z'), listings, prev: out.data, state: again.state, log: () => {} });
RULES.monthlyReads = saved;
assert.ok(calls > 0, 'reads again the next day');
for (const id of Object.keys(out.data.buzz)) assert.equal(next.data.buzz[id].observed_at, out.data.buzz[id].observed_at, `${id} read under 24 h ago is not re-read`);

// Three announcement scans a day, at least 5 hours apart; each run keeps reads for the scans still to come.
{
  RULES.monthlyReads = 90 * 16; let q = [];
  const f2 = async (url) => { q.push(new URL(url).searchParams.get('query')); return fetchImpl(url); };
  let st = null; let data = null;
  const at = (h) => new Date(`2026-11-20T${String(h).padStart(2, '0')}:00:00Z`);
  const r1 = await run({ token: 't', fetchImpl: f2, now: at(3), listings, prev: data, state: st, log: () => {} }); st = r1.state; data = r1.data;
  assert.equal(st.scans, 1); assert.ok(q.some((x) => x.includes('huggingface.co')) && q.some((x) => x.includes('"AI app"')), 'hub and launch searches both ran');
  assert.ok(st.day_reads <= Math.max(40, Math.floor(st.day_share / 3)), `first scan used at most its part of the day (${st.day_reads} of ${st.day_share})`);
  q = [];
  const r2 = await run({ token: 't', fetchImpl: f2, now: at(5), listings, prev: data, state: st, log: () => {} }); st = r2.state; data = r2.data;
  assert.equal(st.scans, 1, 'too soon (2 h later): no second announcement scan');
  assert.ok(!q.some((x) => x.includes('huggingface.co')));
  const r3 = await run({ token: 't', fetchImpl: f2, now: at(11), listings, prev: data, state: st, log: () => {} }); st = r3.state; data = r3.data;
  const r4 = await run({ token: 't', fetchImpl: f2, now: at(19), listings, prev: data, state: st, log: () => {} }); st = r4.state;
  assert.equal(st.scans, 3, 'three scans a day');
  assert.ok(st.day_reads <= st.day_share, 'never more than the day\'s share');
  q = [];
  await run({ token: 't', fetchImpl: f2, now: at(23), listings, prev: r4.data, state: st, log: () => {} });
  assert.ok(!q.some((x) => x.includes('huggingface.co')), 'no fourth scan');
  const launch = r1.data.announcements.find((a) => a.kind === 'launch');
  assert.equal(launch, undefined, 'launch posts without their own site or with few likes are not kept');
  RULES.monthlyReads = saved;
}

// Names can't change the query; a failed scan leaves its slot open.
assert.equal(queryFor({ type: 'model', name: 'Evil" OR (spam) -foo', relations: [], distributions: [] }), '("Evil foo") -is:retweet');
{
  RULES.monthlyReads = 90 * 16;
  const down = async () => new Response('{}', { status: 429, headers: { 'x-rate-limit-reset': String(Math.floor(Date.now() / 1000) + 900) } });
  const r = await run({ token: 't', fetchImpl: down, now: new Date('2026-11-21T03:00:00Z'), listings, log: () => {} });
  assert.equal(r.state.scans, 0, 'failed searches do not use up the scan slot');
  RULES.monthlyReads = saved;
}
console.log('All X monitoring tests passed.');
// Announcements are re-checked about a day later: likes build up, and a post judged too early can still count.
{
  const { XClient } = await import('./x.mjs');
  let asked = null;
  const xc = new XClient('t', { budget: 50, fetchImpl: async (u) => { asked = u; return { ok: true, json: async () => ({ data: [{ id: '11', public_metrics: { like_count: 80, retweet_count: 5 } }] }) }; }, log: () => {} });
  const m = await xc.lookup(['11', '12']);
  assert.ok(asked.includes('/tweets?ids=11%2C12')); assert.equal(m.get('11').likes, 80); assert.equal(xc.reads, 1);
  const none = new XClient('t', { budget: 1, fetchImpl: async () => { throw new Error('no'); }, log: () => {} });
  assert.equal(await none.lookup(['1', '2']), null, 'never over budget');
  console.log('X re-check tests passed.');
}

// X refusing the token: the run stops with X's own reason and the status code (main() saves it as last_error).
{
  const { run } = await import('./x.mjs');
  const fetchImpl = async () => new Response(JSON.stringify({ title: 'Unauthorized', detail: 'Unauthorized', status: 401 }), { status: 401, headers: { 'content-type': 'application/json' } });
  let err = null;
  try { await run({ token: 't', fetchImpl, now: new Date('2026-11-19T04:03:00Z'), listings: [], prev: null, state: { month: '2026-11', reads: 0 }, log: () => {} }); } catch (e) { err = e; }
  if (!err || err.status !== 401 || err.message !== 'X rejected the request (401: Unauthorized)') throw new Error(`X 401 not reported: ${err?.message}`);
  console.log('X refusal test passed');
}

// No expansions (X bills expanded author profiles separately): searches ask only for post fields, links use /i/status/.
{
  const { XClient } = await import('./x.mjs');
  let asked = '';
  const fetchImpl = async (u) => { asked = u; return new Response(JSON.stringify({ data: [{ id: '42', author_id: '777', text: 'hi', created_at: '2026-11-19T00:00:00Z', public_metrics: { like_count: 1 } }] }), { status: 200, headers: { 'content-type': 'application/json' } }); };
  const got = await new XClient('t', { budget: 100, fetchImpl, log: () => {} }).search('q', 10);
  if (/expansions|user\.fields/.test(asked)) throw new Error(`search still asks for expansions: ${asked}`);
  if (got[0].author !== '777') throw new Error('author should be the numeric id');
  const R = await import('../render.js');
  if (R.xHandle('777') !== '' || R.xHandle('alice') !== '@alice') throw new Error('xHandle');
  console.log('No-expansions test passed');
}
