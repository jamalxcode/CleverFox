// Discovery beyond X, run with every scan (3 times a day):
//  1. Hugging Face new releases: recently created models and datasets that already show interest;
//  2. llm-releases.com: links to Hugging Face models and datasets, and release announcements (robots.txt respected);
//  3. GitHub: brand-new AI projects (repository search) and releases of a watchlist (data/github-watch.json plus
//     GitHub projects linked from seed listings). New projects and releases are kept apart: a new repository is
//     not a usable release.
// Models and datasets found here are filled in from Hugging Face by tools/import.mjs (--x-only in quick scans).
// Output: data/imported/discover.json. Each source keeps its last data if it fails.
//
// Usage: node tools/discover.mjs     Env: GH_TOKEN (GitHub API; the workflow passes its own token), HF_TOKEN (optional)
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { linksIn } from './x.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data', 'imported', 'discover.json');
const HF = 'https://huggingface.co';
const UA = 'CleverFox/1.0 (+https://jamalxcode.github.io/CleverFox/)';
export const RULES = { newDays: 14, hfMinLikes: 10, githubDays: 14, keepDays: 30, releaseDays: 30 };
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
  const hub = linksIn(links.map((l) => l.url));
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
  return { checked_at: now.toISOString(), allowed: true, source_url: site, ...releasesFromHtml(await res.text(), site) };
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

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  const out = { ...prev };
  for (const [key, fn] of [['huggingface', () => hfNew()], ['llm_releases', () => llmReleases()], ['github', () => github({ prev: prev.github || {} })]]) {
    try { out[key] = await fn(); console.log(`Discover ${key}: ${JSON.stringify(Object.fromEntries(Object.entries(out[key]).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length])))}`); }
    catch (e) { console.warn(`Discover ${key} failed (${e.message}); keeping the last data`); }
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
