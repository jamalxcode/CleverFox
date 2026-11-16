// Discovery beyond X, run with every scan (3 times a day):
//  1. Hugging Face new releases: recently created models and datasets that already show interest;
//  2. llm-releases.com: links to Hugging Face models and datasets, and release announcements (robots.txt respected);
//  3. GitHub: brand-new AI projects (repository search) and releases of a watchlist (data/github-watch.json plus
//     GitHub projects linked from seed listings). New projects and releases are kept apart: a new repository is
//     not a usable release.
//  4. YouTube: official channels' uploads and keyword search (YOUTUBE_API_KEY).
//  5. Replicate: models published or updated there, with Replicate's own collections as their tasks (REPLICATE_API_TOKEN).
// Models and datasets found here are filled in from Hugging Face by tools/import.mjs (--x-only in quick scans).
// Output: data/imported/discover.json. Each source keeps its last data if it fails.
//
// Usage: node tools/discover.mjs     Env: GH_TOKEN (GitHub API; the workflow passes its own token), HF_TOKEN (optional),
//        YOUTUBE_API_KEY and REPLICATE_API_TOKEN (optional; each source is skipped without its key)
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { linksIn } from './x.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data', 'imported', 'discover.json');
const HF = 'https://huggingface.co';
const UA = 'CleverFox/1.0 (+https://jamalxcode.github.io/CleverFox/)';
export const RULES = { newDays: 14, hfMinLikes: 10, githubDays: 14, keepDays: 30, releaseDays: 30, videoDays: 14, replicatePages: 10, replicateMinRuns: 500, replicateCollections: 20, reviewsPerScan: 15, reviewDays: 7, reviewModels: 80 };
// Replicate collections (by slug) -> the task they stand for. Collections not matched here are ignored.
export const REPLICATE_TASKS = [
  [/image-to-video/, 'image-to-video'], [/text-to-video|video-gen|generate-videos/, 'text-to-video'],
  [/text-to-image|image-gen|generate-images/, 'text-to-image'], [/image-edit|edit-images|image-to-image|restor|upscal|super-res/, 'image-to-image'],
  [/language-model|^llms?$|chat/, 'text-generation'], [/speech-to-text|speech-recog|transcri/, 'automatic-speech-recognition'],
  [/text-to-speech|speech-gen|voice/, 'text-to-speech'], [/vision|image-to-text|caption/, 'image-text-to-text'],
  [/embedding/, 'feature-extraction'], [/music|audio-gen|sound/, 'text-to-audio'],
];
// Optional YouTube keyword searches (only with YOUTUBE_API_KEY; each costs 100 of the free 10,000 daily quota units).
export const YOUTUBE_QUERIES = ['new AI model release', 'open source LLM released', 'new AI app launch', 'GPU cloud launch'];
// The repository searches (GitHub's own search syntax); {since} is today minus githubDays.
export const GITHUB_QUERIES = [
  { label: 'LLM projects', q: 'topic:llm created:>={since} stars:>=10 archived:false' },
  { label: 'Datasets', q: 'dataset in:name,description created:>={since} stars:>=5 archived:false' },
  { label: 'Inference tools', q: 'inference in:name,description created:>={since} stars:>=10 archived:false' },
  { label: 'AI agents', q: 'topic:ai-agents created:>={since} stars:>=10 archived:false' },
];
const TASKS = ['text-generation', 'image-text-to-text', 'text-to-image', 'automatic-speech-recognition', 'text-to-speech', 'feature-extraction', 'sentence-similarity', 'translation', 'image-to-text', 'text-to-video', 'image-to-image', 'audio-text-to-text', 'any-to-any', 'summarization', 'text-classification'];

const getJson = async (url, headers = {}, fetchImpl = fetch) => {
  const res = await fetchImpl(url, { headers: { 'user-agent': UA, accept: 'application/json', ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.split('?')[0]}`);
  return res.json();
};
const daysAgo = (iso, now) => (now - new Date(iso)) / 86400000;

// 1. Hugging Face: new models and datasets with early interest (trending, or newest with enough likes).
export async function hfNew({ now = new Date(), fetchImpl = fetch } = {}) {
  const h = process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {};
  const ex = (fields) => fields.map((e) => `expand[]=${e}`).join('&');
  const [trending, newest, dTrending] = await Promise.all([
    getJson(`${HF}/api/models?sort=trendingScore&direction=-1&limit=300&${ex(['createdAt', 'likes', 'downloads', 'pipeline_tag'])}`, h, fetchImpl),
    getJson(`${HF}/api/models?sort=createdAt&direction=-1&limit=1000&${ex(['createdAt', 'likes', 'downloads', 'pipeline_tag'])}`, h, fetchImpl),
    getJson(`${HF}/api/datasets?sort=trendingScore&direction=-1&limit=200&${ex(['createdAt', 'likes', 'downloads'])}`, h, fetchImpl),
  ]);
  const fresh = (m) => m.createdAt && daysAgo(m.createdAt, now) <= RULES.newDays;
  const models = new Map();
  for (const m of trending) if (fresh(m) && TASKS.includes(m.pipeline_tag)) models.set(m.id, { id: m.id, likes: m.likes || 0, created_at: m.createdAt, why: 'trending' });
  for (const m of newest) if (fresh(m) && TASKS.includes(m.pipeline_tag) && (m.likes || 0) >= RULES.hfMinLikes && !models.has(m.id)) models.set(m.id, { id: m.id, likes: m.likes, created_at: m.createdAt, why: 'new with likes' });
  const datasets = dTrending.filter((d) => fresh(d) && (d.likes || 0) >= RULES.hfMinLikes).map((d) => ({ id: d.id, likes: d.likes, created_at: d.createdAt, why: 'trending' }));
  return { checked_at: now.toISOString(), models: [...models.values()], datasets };
}

// robots.txt: is this path allowed for any crawler ("*") or for us?
export function robotsAllows(txt, path = '/') {
  let applies = false; const rules = [];
  for (const raw of String(txt || '').split('\n')) {
    const line = raw.replace(/#.*/, '').trim(); if (!line) continue;
    const [k, ...v] = line.split(':'); const key = k.trim().toLowerCase(); const val = v.join(':').trim();
    if (key === 'user-agent') applies = val === '*' || /cleverfox/i.test(val);
    else if (applies && (key === 'disallow' || key === 'allow')) rules.push([key, val]);
  }
  const hits = rules.filter(([, p]) => p && path.startsWith(p)).sort((a, b) => b[1].length - a[1].length);
  return !hits.length || hits[0][0] === 'allow';
}

// 2. llm-releases.com: whatever its layout, collect links to Hugging Face models and datasets and to announcements.
export function releasesFromHtml(html, base) {
  const links = [...String(html).matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(([, href, text]) => {
    try { return { url: new URL(href, base).href, text: text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140) }; } catch { return null; }
  }).filter(Boolean);
  // Pages built from embedded data list their releases in JSON, not links: read Hugging Face addresses anywhere in the HTML.
  const anywhere = (String(html).match(/https?:\\?\/\\?\/(?:www\.)?huggingface\.co\\?\/[\w.-]+(?:\\?\/[\w.-]+){1,2}/g) || []).map((u) => u.replace(/\\\//g, '/'));
  const hub = linksIn([...links.map((l) => l.url), ...anywhere]);
  const host = new URL(base).hostname;
  const others = links.filter((l) => { try { const h = new URL(l.url).hostname; return h !== host && !/huggingface\.co|hf\.co/.test(h) && l.text.length >= 4; } catch { return false; } });
  const seen = new Set();
  return { hf_models: hub.models, hf_datasets: hub.datasets, announcements: others.filter((l) => !seen.has(l.url) && seen.add(l.url)).slice(0, 60) };
}
export async function llmReleases({ now = new Date(), fetchImpl = fetch } = {}) {
  const site = 'https://www.llm-releases.com/';
  const robots = await fetchImpl(new URL('/robots.txt', site), { headers: { 'user-agent': UA } }).then((r) => (r.ok ? r.text() : '')).catch(() => '');
  if (!robotsAllows(robots, '/')) return { checked_at: now.toISOString(), allowed: false, hf_models: [], hf_datasets: [], announcements: [] };
  const res = await fetchImpl(site, { headers: { 'user-agent': UA, accept: 'text/html' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  // The home page links to the site's own release pages; follow up to 25 of them (robots.txt allowed, one at a time)
  // and collect Hugging Face links and outside announcements there too.
  const host = new URL(site).hostname;
  const inner = [...new Set([...html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)].map(([, h]) => { try { return new URL(h, site); } catch { return null; } })
    .filter((u) => u && u.hostname === host && u.pathname.split('/').filter(Boolean).length >= 1 && !/^\/(about|privacy|terms|contact|login|signup|rss|feed)/i.test(u.pathname) && robotsAllows(robots, u.pathname)).map((u) => u.href))].slice(0, 25);
  const pages = [html];
  for (const u of inner) {
    try { const rr = await fetchImpl(u, { headers: { 'user-agent': UA, accept: 'text/html' } }); if (rr.ok) pages.push(await rr.text()); } catch { /* skip */ }
    await new Promise((res2) => setTimeout(res2, 500));
  }
  // Diagnostics: page size, link count and title, to see whether the page is built by JavaScript (no links in the HTML).
  const domains = {}; for (const m of html.matchAll(/https?:\\?\/\\?\/([\w.-]+\.[a-z]{2,})/gi)) domains[m[1].toLowerCase()] = (domains[m[1].toLowerCase()] || 0) + 1;
  const diag = { html_chars: html.length, links_in_html: (html.match(/<a\b/gi) || []).length, next_data: html.includes('__NEXT_DATA__'), top_domains: Object.entries(domains).sort((a, b) => b[1] - a[1]).slice(0, 15), title: (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim().slice(0, 120) };
  const parts = pages.map((pg) => releasesFromHtml(pg, site));
  const seen = new Set();
  return { checked_at: now.toISOString(), allowed: true, source_url: site, diag: { ...diag, inner_pages: inner.length, read: pages.length - 1 },
    hf_models: [...new Set(parts.flatMap((x) => x.hf_models))], hf_datasets: [...new Set(parts.flatMap((x) => x.hf_datasets))],
    announcements: parts.flatMap((x) => x.announcements).filter((a) => !seen.has(a.url) && seen.add(a.url)).slice(0, 60) };
}

// 3. GitHub: new projects (search) and watchlist releases.
export function watchlist() {
  const w = existsSync(join(root, 'data', 'github-watch.json')) ? JSON.parse(readFileSync(join(root, 'data', 'github-watch.json'), 'utf8')).repos || [] : [];
  const fromSeed = readdirSync(join(root, 'data', 'seed')).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(readFileSync(join(root, 'data', 'seed', f), 'utf8')))
    .flatMap((r) => [r.url, ...(r.official_urls || []), ...(r.documentation_urls || [])]).map((u) => String(u || '').match(/github\.com\/([\w.-]+)\/([\w.-]+)/)).filter(Boolean).map((m) => `${m[1]}/${m[2].replace(/\.git$/, '')}`);
  return [...new Set([...w, ...fromSeed])];
}
export async function github({ now = new Date(), prev = {}, fetchImpl = fetch, token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN } = {}) {
  const h = token ? { authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28' } : {};
  const since = new Date(now - RULES.githubDays * 86400000).toISOString().slice(0, 10);
  const seen = new Map((prev.new_repos || []).filter((r) => daysAgo(r.first_seen, now) <= RULES.keepDays).map((r) => [r.id, r]));
  for (const { label, q } of GITHUB_QUERIES) {
    const data = await getJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(q.replace('{since}', since))}&sort=stars&order=desc&per_page=30`, h, fetchImpl);
    for (const r of data.items || []) {
      const e = seen.get(r.id) || { id: r.id, first_seen: now.toISOString(), query: label };
      seen.set(r.id, { ...e, full_name: r.full_name, url: r.html_url, description: (r.description || '').slice(0, 200), stars: r.stargazers_count, created_at: r.created_at, topics: (r.topics || []).slice(0, 8) });
    }
  }
  const releases = new Map((prev.releases || []).filter((r) => daysAgo(r.published_at, now) <= RULES.releaseDays).map((r) => [r.id, r]));
  for (const repo of watchlist()) {
    try {
      const rel = await getJson(`https://api.github.com/repos/${repo}/releases/latest`, h, fetchImpl);
      if (rel?.id && rel.published_at && daysAgo(rel.published_at, now) <= RULES.releaseDays) releases.set(rel.id, { id: rel.id, repo, tag: rel.tag_name, name: (rel.name || rel.tag_name || '').slice(0, 120), url: rel.html_url, published_at: rel.published_at });
    } catch { /* no releases, or the repo is gone: skip */ }
  }
  return { checked_at: now.toISOString(), queries: GITHUB_QUERIES.map((x) => x.q.replace('{since}', since)), new_repos: [...seen.values()].sort((a, b) => b.stars - a.stars), releases: [...releases.values()].sort((a, b) => b.published_at.localeCompare(a.published_at)) };
}

// 4. YouTube: official AI makers' channels (free RSS feeds, no key) and, with a key, keyword searches.
// A channel's id is confirmed from its own page (its canonical /channel/UC… link) and cached; unconfirmed handles are skipped.
export function feedEntries(xml) {
  return [...String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
    const tag = (t) => (e.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`))?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const unesc = (t) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const description = unesc(tag('media:description'));
    return { id: tag('yt:videoId'), title: unesc(tag('title')).slice(0, 160), url: e.match(/<link[^>]+href="([^"]+)"/)?.[1] || null, published_at: tag('published'), links: linksIn(description.match(/https?:\/\/[^\s)"'<>]+/g) || []) };
  }).filter((v) => v.id && v.url);
}
const unescHtml = (t) => String(t).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
export async function youtube({ now = new Date(), prev = {}, fetchImpl = fetch, key = process.env.YOUTUBE_API_KEY } = {}) {
  const file = join(root, 'data', 'youtube-channels.json');
  const channels = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).channels || [] : [];
  const ids = { ...(prev.channel_ids || {}) }; const skipped = [];
  const robots = await fetchImpl('https://www.youtube.com/robots.txt', { headers: { 'user-agent': UA } }).then((r) => (r.ok ? r.text() : '')).catch(() => '');
  for (const c of channels) {
    if (ids[c.handle]) continue;
    if (!robotsAllows(robots, `/${c.handle}`)) { skipped.push(`${c.handle} (robots.txt)`); continue; }
    try {
      const html = await (await fetchImpl(`https://www.youtube.com/${c.handle}`, { headers: { 'user-agent': UA, 'accept-language': 'en' } })).text();
      const id = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1];
      if (id) ids[c.handle] = id; else skipped.push(`${c.handle} (no channel id on its page)`);
    } catch { skipped.push(`${c.handle} (page failed)`); }
  }
  const videos = new Map((prev.videos || []).filter((v) => daysAgo(v.published_at, now) <= RULES.videoDays).map((v) => [v.id, v]));
  const feeds = {}; // per channel: HTTP status, entries in the feed, entries in the last videoDays (to see why a channel shows nothing)
  for (const c of channels) {
    const id = ids[c.handle]; if (!id) continue;
    if (key) {
      // The channel's uploads list ("UU" + the id after "UC"): 1 quota unit, and more reliable than the RSS feed.
      try {
        const d = await getJson(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=15&playlistId=UU${id.slice(2)}&key=${encodeURIComponent(key)}`, {}, fetchImpl);
        let recent = 0;
        for (const it of d.items || []) {
          const sn = it.snippet || {}; const vid = sn.resourceId?.videoId; const at = sn.publishedAt;
          if (!vid || !at || daysAgo(at, now) > RULES.videoDays) continue;
          recent++;
          videos.set(vid, { id: vid, title: unescHtml(sn.title || '').slice(0, 160), url: `https://www.youtube.com/watch?v=${vid}`, published_at: at, links: linksIn(String(sn.description || '').match(/https?:\/\/[^\s)"'<>]+/g) || []), channel: c.name, handle: c.handle });
        }
        feeds[c.handle] = { via: 'api', entries: (d.items || []).length, recent, newest: d.items?.[0]?.snippet?.publishedAt || null };
        continue;
      } catch (e) { feeds[c.handle] = { via: 'api', error: String(e.message || e).slice(0, 80) }; }
    }
    try {
      const res = await fetchImpl(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, { headers: { 'user-agent': UA } });
      if (!res.ok) { feeds[c.handle] = { ...(feeds[c.handle] || {}), status: res.status }; continue; }
      const all = feedEntries(await res.text()); let recent = 0;
      for (const v of all) if (daysAgo(v.published_at, now) <= RULES.videoDays) { recent++; videos.set(v.id, { ...v, channel: c.name, handle: c.handle }); }
      feeds[c.handle] = { status: res.status, entries: all.length, recent, newest: all[0]?.published_at || null };
    } catch (e) { feeds[c.handle] = { status: 0, error: String(e.message || e).slice(0, 80) }; }
  }
  let search = prev.search || [];
  if (key) {
    const found = new Map();
    const after = new Date(now - 3 * 86400000).toISOString();
    for (const q of YOUTUBE_QUERIES) {
      try {
        const d = await getJson(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&maxResults=15&publishedAfter=${encodeURIComponent(after)}&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`, {}, fetchImpl);
        for (const it of d.items || []) if (it.id?.videoId) found.set(it.id.videoId, { id: it.id.videoId, title: unescHtml(it.snippet?.title || '').slice(0, 160), url: `https://www.youtube.com/watch?v=${it.id.videoId}`, channel: unescHtml(it.snippet?.channelTitle || ''), published_at: it.snippet?.publishedAt, query: q });
      } catch { /* quota or error: keep the last search */ }
    }
    if (found.size) search = [...found.values()];
  }
  const reviews = key ? await youtubeReviews({ now, prev: prev.reviews || {}, fetchImpl, key }) : prev.reviews || {};
  const vids = [...videos.values()].sort((a, b) => b.published_at.localeCompare(a.published_at));
  return { checked_at: now.toISOString(), channel_ids: ids, skipped, feeds, videos: vids, search, reviews, hf_models: [...new Set(vids.flatMap((v) => v.links.models))], hf_datasets: [...new Set(vids.flatMap((v) => v.links.datasets))] };
}

// YouTube reviews of listings ("<name> review"): a few listings per scan, the least recently checked first, each
// re-checked after reviewDays. Candidates: every app and host, hand-researched models and the most popular imported
// models (no datasets, nothing with a warning, no uncensored models). Only videos whose titles name the listing are kept.
// Each search costs 100 of the free 10,000 daily quota units: 15 a scan, 3 scans a day = 4,500.
export function reviewCandidates(dir = join(root, 'data')) {
  const read = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return []; } };
  const seed = readdirSync(join(dir, 'seed')).filter((f) => f.endsWith('.json')).flatMap((f) => read(join(dir, 'seed', f)));
  const pop = (r) => (r.popularity || []).reduce((n, p) => n + (p.downloads_30d || 0) + (p.likes || 0) * 50, 0);
  const imported = read(join(dir, 'imported', 'models.json')).filter((r) => r.warning === 'none' && !r.uncensored).sort((a, b) => pop(b) - pop(a)).slice(0, RULES.reviewModels);
  return [...seed.filter((r) => r.type !== 'dataset' && (r.warning || 'none') === 'none'), ...imported].map((r) => ({ id: r.id, name: r.name, type: r.type, publisher: r.publisher_name || r.publisher }));
}
export const reviewQuery = (r) => { const name = r.name.replace(/\s*\(.*?\)\s*/g, ' ').trim(); return `${/\s/.test(name) ? `"${name}"` : name}${name.length <= 4 ? ` ${r.publisher}` : ''} review`; };
const normT = (t) => ' ' + String(t || '').toLowerCase().replace(/[^\p{L}\p{N}.]+/gu, ' ') + ' ';
export async function youtubeReviews({ now = new Date(), prev = {}, fetchImpl = fetch, key, candidates = reviewCandidates() } = {}) {
  const out = Object.fromEntries(Object.entries(prev).filter(([id]) => candidates.some((c) => c.id === id)));
  const due = candidates.filter((c) => !out[c.id] || daysAgo(out[c.id].checked_at, now) >= RULES.reviewDays)
    .sort((a, b) => String(out[a.id]?.checked_at || '').localeCompare(String(out[b.id]?.checked_at || ''))).slice(0, RULES.reviewsPerScan);
  for (const c of due) {
    try {
      const d = await getJson(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=relevance&maxResults=8&q=${encodeURIComponent(reviewQuery(c))}&key=${encodeURIComponent(key)}`, {}, fetchImpl);
      const name = normT(c.name.replace(/\s*\(.*?\)\s*/g, ' ')).trim();
      const videos = (d.items || []).filter((it) => it.id?.videoId && normT(unescHtml(it.snippet?.title)).includes(` ${name} `)).slice(0, 4)
        .map((it) => ({ id: it.id.videoId, title: unescHtml(it.snippet.title).slice(0, 160), channel: unescHtml(it.snippet.channelTitle || ''), published_at: it.snippet.publishedAt, url: `https://www.youtube.com/watch?v=${it.id.videoId}` }));
      out[c.id] = { checked_at: now.toISOString(), query: reviewQuery(c), videos };
    } catch (e) { if (/HTTP 403/.test(e.message)) break; /* quota used up: try again next scan */ }
  }
  return out;
}

// 5. Replicate (api.replicate.com, needs a free account's REPLICATE_API_TOKEN): models whose newest version is recent,
// or first seen recently, that are official (run by their maker) or already have runs. Tasks come from Replicate's own
// collections. The first run only records what exists (a baseline), so the whole back catalog isn't called "new".
export async function replicate({ now = new Date(), prev = {}, fetchImpl = fetch, token = process.env.REPLICATE_API_TOKEN } = {}) {
  if (!token) return { ...prev, checked_at: now.toISOString(), skipped: 'no REPLICATE_API_TOKEN' };
  const API = 'https://api.replicate.com/v1';
  const get = async (url) => {
    for (let i = 0; i < 4; i++) {
      const res = await fetchImpl(url, { headers: { 'user-agent': UA, accept: 'application/json', authorization: `Bearer ${token}` } });
      if (res.status === 429) { await new Promise((r) => setTimeout(r, Math.min(30, +(res.headers?.get?.('retry-after') || 0) || 2 ** i * 2) * 1000)); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.replace(API, '').split('?')[0]}`);
      return res.json();
    }
    throw new Error('HTTP 429 (rate limited)');
  };
  // Models, newest version first (the sort is ignored if the API doesn't support it; dates are checked below anyway).
  const all = []; let url = `${API}/models?sort_by=latest_version_created_at&sort_direction=desc`; let pages = 0;
  while (url && pages < RULES.replicatePages) { const d = await get(url); all.push(...(d.results || [])); url = d.next || null; pages++; }
  // Collections -> tasks.
  const tasks = {}; let collections = 0;
  try {
    const list = []; let cu = `${API}/collections`; let cp = 0;
    while (cu && cp < 5) { const d = await get(cu); list.push(...(d.results || [])); cu = d.next || null; cp++; }
    for (const c of list.filter((c) => REPLICATE_TASKS.some(([re]) => re.test(c.slug))).slice(0, RULES.replicateCollections)) {
      const task = REPLICATE_TASKS.find(([re]) => re.test(c.slug))[1];
      try { const d = await get(`${API}/collections/${encodeURIComponent(c.slug)}`); collections++; for (const m of d.models || []) (tasks[`${m.owner}/${m.name}`] ||= new Set()).add(task); } catch { /* skip this collection */ }
    }
  } catch { /* collections are optional */ }
  const baseline = !prev.first_seen;
  const firstSeen = { ...(prev.first_seen || {}) };
  const today = now.toISOString().slice(0, 10);
  const models = new Map((prev.models || []).filter((m) => daysAgo(m.first_seen === 'baseline' ? m.version_at : m.first_seen, now) <= RULES.keepDays).map((m) => [m.id, m]));
  for (const m of all) {
    if (m.visibility && m.visibility !== 'public') continue;
    const id = `${m.owner}/${m.name}`;
    if (!firstSeen[id]) firstSeen[id] = baseline ? 'baseline' : today;
    const versionAt = m.latest_version?.created_at || null;
    const fresh = (versionAt && daysAgo(versionAt, now) <= RULES.newDays) || (firstSeen[id] !== 'baseline' && daysAgo(firstSeen[id], now) <= RULES.newDays);
    if (!fresh || !(m.is_official || (m.run_count || 0) >= RULES.replicateMinRuns)) { if (models.has(id)) Object.assign(models.get(id), { runs: m.run_count ?? null }); continue; }
    models.set(id, { id, owner: m.owner, name: m.name, url: m.url || `https://replicate.com/${id}`, description: String(m.description || '').replace(/\s+/g, ' ').trim().slice(0, 300),
      official: !!m.is_official, runs: m.run_count ?? null, github_url: m.github_url || null, paper_url: m.paper_url || null, license_url: m.license_url || null,
      version_at: versionAt, first_seen: firstSeen[id], tasks: [...(tasks[id] || [])] });
  }
  for (const [id, t] of Object.entries(tasks)) if (models.has(id) && !models.get(id).tasks.length) models.get(id).tasks = [...t];
  return { checked_at: now.toISOString(), source_url: `${API}/models`, baseline, pages, seen: all.length, collections, models: [...models.values()].sort((a, b) => String(b.version_at || b.first_seen).localeCompare(String(a.version_at || a.first_seen))), first_seen: firstSeen };
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  const out = { ...prev };
  for (const [key, fn] of [['huggingface', () => hfNew()], ['llm_releases', () => llmReleases()], ['github', () => github({ prev: prev.github || {} })], ['youtube', () => youtube({ prev: prev.youtube || {} })], ['replicate', () => replicate({ prev: prev.replicate || {} })]]) {
    try { out[key] = await fn(); console.log(`Discover ${key}: ${JSON.stringify(Object.fromEntries(Object.entries(out[key]).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length])))}`); }
    catch (e) { console.warn(`Discover ${key} failed (${e.message}); keeping the last data`); }
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
