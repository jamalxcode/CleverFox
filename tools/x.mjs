// X monitoring (spec section 9): new announcements, praise and validation for CleverFox listings.
//  - Announcements: recent posts linking to Hugging Face models/datasets or the Ollama library. The
//    importer confirms each linked model at its source before listing it.
//  - Praise and validation: for a rotating batch of listings, recent posts that name them; posts with
//    good words ("amazing", "impressive", "best", 🔥 ... in several languages, negations skipped) count
//    as praise, and their likes, reposts and distinct authors measure validation.
// Stores post ids, authors and counts only, never post text. Runs only with an X_BEARER_TOKEN secret.
//
// Usage: node tools/x.mjs     Env: X_BEARER_TOKEN, X_MONTHLY_READS (default 10000)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMPORTED = join(root, 'data', 'imported');
const API = 'https://api.x.com/2';
const NOW = () => new Date();
export const RULES = {
  monthlyReads: +(process.env.X_MONTHLY_READS || 10000),
  announcementPosts: 100,     // posts read per run for announcements
  scansPerDay: 3,             // announcement scans a day (cron-job.org starts the runs)
  scanGapHours: 5,            // minimum gap between two announcement scans
  postsPerListing: 10,        // X's minimum page size
  praisedMinPosts: 5,         // "📣 Praised on X": at least this many praise posts...
  praisedMinAuthors: 4,       // ...from this many different accounts...
  praisedMinLikes: 200,       // ...with at least this many likes between them
  announceMinLikes: 25,       // an announcement is imported only with this much engagement
  buzzKeepDays: 30, refreshHours: 24,           // buzz older than this is dropped as stale
};

// Good words in several languages. Matched case-insensitively; a negation just before cancels it.
const PRAISE = [
  'amazing', 'impressive', 'incredible', 'awesome', 'excellent', 'outstanding', 'fantastic', 'brilliant', 'insane', 'wow',
  'game changer', 'game-changer', 'best', 'love it', 'loving', 'great', 'blown away', 'mind blowing', 'mind-blowing', 'beats', 'sota',
  'state of the art', 'state-of-the-art', 'goated', 'killer', 'superb', 'blazing fast', 'so good', 'really good', 'works great', 'recommend',
  'increíble', 'excelente', 'genial', 'incrível', 'ótimo', 'incroyable', 'génial', 'excellent', 'großartig', 'fantastisch', 'beeindruckend',
  'потрясающ', 'отличн', 'круто', 'mükemmel', 'harika', 'luar biasa', 'keren', 'mantap', 'tuyệt vời', 'yang terbaik',
  'رائع', 'ممتاز', 'مذهل', 'أفضل', 'शानदार', 'बेहतरीन', 'कमाल', 'すごい', '素晴らしい', '最高', '最强', '厉害', '牛逼', '太牛', '强大', '太强', '好用', '최고', '대박', '굉장',
];
const PRAISE_EMOJI = ['🔥', '🚀', '🤯', '😍', '👏', '💯', '🙌', '❤️', '😮'];
// Critical words: complaints and disappointment, in several languages.
const CRITICAL = [
  'disappointing', 'disappointed', 'overhyped', 'overrated', 'worse', 'worst', 'terrible', 'awful', 'garbage', 'trash', 'useless', 'broken',
  'doesn\'t work', 'does not work', 'not working', 'buggy', 'hallucinates', 'hallucinating', 'unusable', 'meh', 'mid', 'scam', 'fake',
  'too slow', 'so slow', 'refuses', 'censored', 'nerfed', 'regression', 'downgrade', 'waste of', 'fails', 'failed', 'crashes', 'crashed',
  'decepcionante', 'malo', 'basura', 'péssimo', 'ruim', 'décevant', 'nul', 'enttäuschend', 'schlecht', 'разочарован', 'ужасн', 'плох',
  'kötü', 'berbat', 'jelek', 'mengecewakan', 'tệ', 'سيء', 'مخيب', 'فاشل', 'बेकार', 'खराब', 'ひどい', '残念', '最悪', '垃圾', '失望', '难用', '拉胯', '별로', '실망',
];
const CRITICAL_EMOJI = ['👎', '🤮', '💩', '😡', '🙄'];
const NEGATION = /\b(not|no|isn't|isnt|wasn't|aren't|never|hardly|barely|without|nothing)\s+(\w+\s+){0,2}$/i;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PRAISE_RE = PRAISE.map((w) => [w, /^[a-z\s-]+$/i.test(w) ? new RegExp(`(^|[^\\p{L}])${esc(w)}([^\\p{L}]|$)`, 'iu') : new RegExp(esc(w), 'iu')]);
const CRITICAL_RE = CRITICAL.map((w) => [w, /^[a-z\s'-]+$/i.test(w) ? new RegExp(`(^|[^\\p{L}])${esc(w)}([^\\p{L}]|$)`, 'iu') : new RegExp(esc(w), 'iu')]);
export function isCritical(text) {
  const t = String(text || '');
  for (const [, re] of CRITICAL_RE) {
    const m = re.exec(t);
    if (m && !NEGATION.test(t.slice(Math.max(0, m.index - 40), m.index + (m[1] || '').length))) return true;
  }
  return false; // emoji alone never mark a post critical
}
// positive, critical or general (both or neither -> general)
export function tone(text) {
  const p = isPraise(text); const c = isCritical(text);
  return p && !c ? 'positive' : c && !p ? 'critical' : 'general';
}
export function isPraise(text) {
  const t = String(text || '');
  for (const [, re] of PRAISE_RE) {
    const m = re.exec(t);
    if (m && !NEGATION.test(t.slice(Math.max(0, m.index - 40), m.index + (m[1] || '').length))) return true;
  }
  return false; // emoji alone never mark a post positive
}

// Links in a post: Hugging Face models and datasets, Ollama library families.
const HF_RESERVED = new Set(['datasets', 'spaces', 'docs', 'blog', 'papers', 'models', 'collections', 'organizations', 'settings', 'join', 'login', 'pricing', 'learn', 'tasks', 'api', 'chat']);
// Hosts that are never an app or hosting launch themselves.
const SOCIAL = /(^|\.)(x\.com|twitter\.com|t\.co|youtube\.com|youtu\.be|github\.com|linkedin\.com|reddit\.com|facebook\.com|instagram\.com|tiktok\.com|medium\.com|substack\.com|discord\.(gg|com)|t\.me|bit\.ly|arxiv\.org|apple\.com|google\.com|huggingface\.co|hf\.co|ollama\.com)$/;
// Launch posts for AI apps and hosting, in several languages.
export const LAUNCH_QUERY = '(introducing OR launching OR launched OR "now available" OR "now live" OR lanzamos OR lançamos OR "kami meluncurkan" OR "نطلق") ("AI app" OR "AI assistant" OR "AI chatbot" OR "GPU cloud" OR "inference API" OR "GPU servers" OR "AI model API") -is:retweet -is:reply has:links';
export function linksIn(urls) {
  const models = new Set(); const datasets = new Set(); const ollama = new Set(); const sites = new Set();
  for (const u of urls || []) {
    let x; try { x = new URL(u); } catch { continue; }
    const p = x.pathname.split('/').filter(Boolean);
    if (/^(www\.)?(huggingface\.co|hf\.co)$/.test(x.hostname)) {
      if (p[0] === 'datasets' && p.length >= 3) datasets.add(`${p[1]}/${p[2]}`);
      else if (p.length >= 2 && !HF_RESERVED.has(p[0])) models.add(`${p[0]}/${p[1]}`);
    } else if (/^(www\.)?ollama\.com$/.test(x.hostname) && p[0] === 'library' && p[1]) ollama.add(p[1].split(':')[0]);
    else if (!SOCIAL.test(x.hostname)) sites.add(x.hostname.replace(/^www\./, ''));
  }
  return { models: [...models], datasets: [...datasets], ollama: [...ollama], sites: [...sites] };
}

export class XClient {
  constructor(token, { budget, fetchImpl = fetch, log = console.log } = {}) { this.token = token; this.budget = budget; this.reads = 0; this.fetch = fetchImpl; this.log = log; }
  async search(query, max) {
    if (this.reads + Math.max(10, Math.min(100, max)) > this.budget) return null; // X returns at least 10 posts per search
    const params = new URLSearchParams({ query, max_results: String(Math.max(10, Math.min(100, max))), sort_order: 'relevancy', 'tweet.fields': 'created_at,public_metrics,author_id,lang,entities,referenced_tweets', expansions: 'author_id', 'user.fields': 'username' });
    for (let attempt = 0; attempt < 4; attempt++) {
      let res;
      try { res = await this.fetch(`${API}/tweets/search/recent?${params}`, { headers: { Authorization: `Bearer ${this.token}`, 'User-Agent': 'CleverFox catalog' } }); }
      catch { await new Promise((r) => setTimeout(r, 2 ** attempt * 1000)); continue; }
      if (res.ok) {
        const body = await res.json();
        this.reads += body.data?.length || 0;
        const users = new Map((body.includes?.users || []).map((u) => [u.id, u.username]));
        return (body.data || []).filter((p) => !(p.referenced_tweets || []).some((r) => r.type === 'retweeted')).map((p) => ({
          id: p.id, author: users.get(p.author_id) || p.author_id, created_at: p.created_at, lang: p.lang, text: p.text || '',
          likes: p.public_metrics?.like_count || 0, reposts: p.public_metrics?.retweet_count || 0, quotes: p.public_metrics?.quote_count || 0,
          urls: (p.entities?.urls || []).map((u) => u.unwound_url || u.expanded_url || u.url).filter(Boolean),
        }));
      }
      if (res.status === 401 || res.status === 403) throw new Error(`X rejected the request (${res.status})`);
      if (res.status === 429) {
        const reset = +res.headers.get('x-rate-limit-reset');
        const wait = reset ? Math.max(1, reset - Math.floor(Date.now() / 1000) + 1) : 30;
        if (wait > 120) { this.log(`X rate limit for ${wait}s; stopping this run`); return null; }
        await new Promise((r) => setTimeout(r, wait * 1000)); continue;
      }
      if (res.status >= 500) { await new Promise((r) => setTimeout(r, 2 ** attempt * 1000)); continue; }
      this.log(`X HTTP ${res.status}`); return null;
    }
    return null;
  }
}

const postUrl = (p) => `https://x.com/${p.author}/status/${p.id}`;
// Search words for a listing: its name in quotes (and its Hugging Face URL for models and datasets).
// Very short or generic names need the URL, or are skipped, to avoid unrelated posts.
const GENERIC = new Set(['chat', 'phi', 'aya', 'base', 'mini', 'llama', 'gemma', 'qwen', 'mistral', 'claude', 'gemini', 'copilot', 'kimi', 'vibe', 'alice']);
// The name people actually write on X: the full name up to its size or variant suffix
// ("Llama 4 Scout 17B-16E Instruct" -> "Llama 4 Scout"). Null for derivatives (quantizations,
// fine-tunes, abliterated re-uploads), whose short name would be the base model's.
const DERIVED = /abliterat|uncensor|heretic|gguf|awq|gptq|exl2|mlx|nvfp4|merge|lora|distill|finetune|-ft\b/i;
const STOP = /^(\d+(\.\d+)?[bmkt]|a\d+(\.\d+)?b|\d+e|\d{4}|instruct|it|chat|base|preview|hf|fp8|fp16|bf16|int[48]|onnx|openvino|rl|sft|dpo|q\d\w*|iq\d\w*)$/i;
export function shortName(r) {
  if (r.type !== 'model' && r.type !== 'dataset') return null;
  const name = r.name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  if (DERIVED.test(name) || (r.relations || []).some((x) => x.type !== 'variant_of')) return null;
  const tokens = name.split(/[-_\s]+/).filter(Boolean);
  const keep = [];
  for (const t of tokens) { if (STOP.test(t)) break; keep.push(t); }
  // Everything cut must be a size, variant or version tag; otherwise it's a different model (a fine-tune).
  if (!tokens.slice(keep.length).every((t) => STOP.test(t) || /^v\d+(\.\d+)*$/i.test(t))) return null;
  const short = keep.join(' ');
  if (!short || short.toLowerCase() === name.replace(/[-_]+/g, ' ').toLowerCase()) return null;
  if (!/[a-z]/i.test(short) || GENERIC.has(short.toLowerCase())) return null;
  if (keep.length === 1 && !(/\d/.test(short) && short.length >= 5)) return null; // a bare brand ("Sarvam") is too broad
  return short;
}

// A listing name can't change the query: quotes, brackets, operators and search keywords are stripped.
export const cleanForQuery = (s) => String(s || '').replace(/["“”'`()[\]{}:#@$*\\]/g, ' ').replace(/(^|\s)-+/g, ' ').replace(/\b(OR|AND|NOT)\b/g, ' ').replace(/\s+/g, ' ').trim();
export function queryFor(r) {
  const name = cleanForQuery(r.name.replace(/\s*\(.*?\)\s*/g, ' '));
  const hf = (r.distributions || []).find((d) => d.source === 'huggingface')?.native_id || (r.type === 'dataset' ? r.official_urls?.[0]?.split('/datasets/')[1] : null);
  const parts = [];
  if (!name) return null;
  const generic = name.length < 5 || GENERIC.has(name.toLowerCase());
  if (!generic) parts.push(`"${name}"`);
  else if (r.type === 'app' || r.type === 'host') parts.push(`"${name}" ${r.type === 'app' ? '(AI OR app)' : '(GPU OR cloud)'}`);
  const sn = shortName(r);
  if (sn) parts.push(`"${cleanForQuery(sn)}"`);
  if (hf && /^[\w.-]+\/[\w.-]+$/.test(hf)) parts.push(`url:"huggingface.co/${r.type === 'dataset' ? 'datasets/' : ''}${hf}"`);
  if (!parts.length) return null;
  return `(${[...new Set(parts)].join(' OR ')}) -is:retweet`;
}

export function summarizeBuzz(posts, now = NOW()) {
  const withTone = posts.map((p) => ({ ...p, tone: tone(p.text) }));
  const praise = withTone.filter((p) => p.tone === 'positive');
  const authors = new Set(praise.map((p) => p.author));
  const likes = praise.reduce((n, p) => n + p.likes, 0);
  const reposts = praise.reduce((n, p) => n + p.reposts + p.quotes, 0);
  const weight = (p) => p.likes + 2 * (p.reposts + p.quotes);
  const pick = (list) => [...list].sort((a, b) => weight(b) - weight(a)).slice(0, 3).map((p) => ({ url: postUrl(p), author: p.author, likes: p.likes, reposts: p.reposts, created_at: p.created_at, lang: p.lang, tone: p.tone }));
  return {
    posts: posts.length,
    positive: praise.length, critical: withTone.filter((p) => p.tone === 'critical').length, general: withTone.filter((p) => p.tone === 'general').length,
    praise_posts: praise.length, praise_authors: authors.size, likes, reposts,
    total_likes: posts.reduce((n, p) => n + p.likes, 0),
    praised: praise.length >= RULES.praisedMinPosts && authors.size >= RULES.praisedMinAuthors && likes >= RULES.praisedMinLikes,
    top: { all: pick(withTone), positive: pick(praise), critical: pick(withTone.filter((p) => p.tone === 'critical')), general: pick(withTone.filter((p) => p.tone === 'general')) },
    observed_at: now.toISOString().replace(/\.\d+Z$/, 'Z'),
  };
}

function listingsByPopularity() {
  const out = [];
  for (const f of ['models.json', 'datasets.json']) {
    const p = join(IMPORTED, f); if (existsSync(p)) out.push(...JSON.parse(readFileSync(p, 'utf8')));
  }
  for (const f of ['models.json', 'apps-global.json', 'apps-regional.json', 'hosts.json']) {
    const p = join(root, 'data', 'seed', f); if (existsSync(p)) out.push(...JSON.parse(readFileSync(p, 'utf8')));
  }
  const pop = (r) => (r.popularity || []).reduce((n, p) => n + (p.downloads_30d || 0) + (p.likes || 0) * 50, 0) + (r.import_source ? 0 : 1e9); // hand-researched first
  return out.sort((a, b) => pop(b) - pop(a));
}

export async function run({ token, fetchImpl = fetch, now = NOW(), listings = null, prev = null, state = null, log = console.log } = {}) {
  const month = now.toISOString().slice(0, 7);
  state = state && state.month === month ? state : { month, reads: 0, cursor: state?.cursor || 0 };
  const daysLeft = Math.max(1, (new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) - now) / 86400000);
  // One day's share per calendar day: running again the same day only spends what's left of today's share.
  const day = now.toISOString().slice(0, 10);
  if (state.day !== day) { state.day = day; state.day_reads = 0; state.day_share = Math.floor(Math.max(0, RULES.monthlyReads - state.reads) / Math.ceil(daysLeft)); }
  const today = Math.max(0, (state.day_share ?? 0) - (state.day_reads || 0));
  let x = new XClient(token, { budget: today, fetchImpl, log });
  if (!today) { log('X: today\'s read share is already spent; keeping the saved results'); return { data: prev || { announcements: [], buzz: {} }, state }; }
  prev = prev || { announcements: [], buzz: {} };

  // 1. Announcements: up to 3 scans a day, at least 5 hours apart. Each scan gets an equal part of what's
  // left of today's share (split over the scans still to come), at most a third of it for announcements.
  if (state.scan_day !== day) { state.scan_day = day; state.scans = 0; }
  const lastScan = state.last_scan ? (now - new Date(state.last_scan)) / 3600000 : Infinity;
  const scanNow = state.scans < RULES.scansPerDay && lastScan >= RULES.scanGapHours;
  const scansLeft = Math.max(1, RULES.scansPerDay - state.scans);
  // At least 40 reads a run (two announcement searches of 10+ and some listings), never more than what's left today.
  const runBudget = scanNow ? Math.min(today, Math.max(Math.floor(today / scansLeft), 40)) : 0;
  // Not a scan slot (too soon after the last scan, or 3 done today): read nothing, keep the saved results.
  if (!scanNow) { log(`X: no scan now (${state.scans} of ${RULES.scansPerDay} today, last ${Number.isFinite(lastScan) ? lastScan.toFixed(1) + ' h ago' : 'never'}); keeping the saved results`); return { data: prev, state }; }
  const annMax = Math.min(RULES.announcementPosts, Math.max(10, Math.floor(runBudget / 3)));
  let ann = []; let launches = [];
  if (scanNow) {
    const a1 = await x.search('(url:"huggingface.co" OR url:"ollama.com/library") -is:retweet -is:reply', Math.ceil(annMax * 0.6));
    const a2 = await x.search(LAUNCH_QUERY, Math.max(10, Math.floor(annMax * 0.4)));
    ann = a1 || []; launches = a2 || [];
    // The slot counts only when a search actually answered; a rate limit or error leaves it for the next run.
    if (a1 || a2) { state.scans++; state.last_scan = now.toISOString(); } else log('X: announcement searches failed; the scan slot stays open for the next run');
  }
  const shape = (p, kind) => ({ kind, url: postUrl(p), author: p.author, created_at: p.created_at, likes: p.likes, reposts: p.reposts, lang: p.lang, links: linksIn(p.urls), found_at: now.toISOString() });
  const announcements = [
    ...ann.map((p) => shape(p, 'hub')).filter((a) => a.links.models.length || a.links.datasets.length || a.links.ollama.length),
    // App and hosting launches: kept when they link to a site of their own and got real engagement.
    ...launches.map((p) => shape(p, 'launch')).filter((a) => a.links.sites.length && (a.likes || 0) >= RULES.announceMinLikes),
  ];
  const seen = new Set(announcements.map((a) => a.url));
  const keptAnn = [...announcements, ...(prev.announcements || []).filter((a) => !seen.has(a.url) && (now - new Date(a.created_at)) / 86400000 <= RULES.buzzKeepDays)];

  // This run's reads stop at its part of today's share, so later scans today still have reads.
  x.budget = Math.min(x.budget, runBudget);
  // 2. Praise and validation for a rotating batch of listings
  listings = listings || listingsByPopularity();
  const buzz = Object.fromEntries(Object.entries(prev.buzz || {}).filter(([, b]) => (now - new Date(b.observed_at)) / 86400000 <= RULES.buzzKeepDays));
  let checked = 0;
  // A listing read in the last 24 hours is kept as is: no second read the same day.
  const fresh = (b) => b?.observed_at && (now - new Date(b.observed_at)) / 3600000 < RULES.refreshHours;
  // Listings that found nothing with an older query go first, with the current one.
  for (const r of listings) {
    const b = buzz[r.id]; const q = queryFor(r);
    if (!b || b.posts || !q || b.q === q || fresh(b)) continue;
    const posts = await x.search(q, RULES.postsPerListing);
    if (!posts) break;
    buzz[r.id] = { ...summarizeBuzz(posts, now), q };
    checked++;
  }
  for (let i = 0; i < listings.length; i++) {
    const r = listings[(state.cursor + i) % listings.length];
    const q = queryFor(r); if (!q || fresh(buzz[r.id])) continue;
    const posts = await x.search(q, RULES.postsPerListing);
    if (!posts) { state.cursor = (state.cursor + i) % listings.length; break; }
    buzz[r.id] = { ...summarizeBuzz(posts, now), q };
    checked++;
    if (i === listings.length - 1) state.cursor = 0;
  }
  state.reads += x.reads; state.day_reads = (state.day_reads || 0) + x.reads;
  log(`X: ${x.reads} posts read today (budget ${today}, ${state.reads}/${RULES.monthlyReads} this month); ${announcements.length} announcement posts; praise checked for ${checked} listings`);
  return { data: { announcements: keptAnn.slice(0, 300), buzz }, state };
}

async function main() {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) { console.log('X_BEARER_TOKEN not set: X monitoring skipped.'); return; }
  mkdirSync(IMPORTED, { recursive: true });
  const dataPath = join(IMPORTED, 'x.json'); const statePath = join(IMPORTED, 'x-state.json');
  const prev = existsSync(dataPath) ? JSON.parse(readFileSync(dataPath, 'utf8')) : null;
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : null;
  try {
    const out = await run({ token, prev, state });
    writeFileSync(dataPath, JSON.stringify(out.data, null, 1) + '\n');
    writeFileSync(statePath, JSON.stringify(out.state, null, 1) + '\n');
  } catch (e) { console.warn(`X monitoring failed, keeping last data: ${e.message}`); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
