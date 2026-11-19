// Pipeline health (decision 86): after each build, what every source brought this run, a 30-day history, and flags
// when a source drops well below its usual count or keeps failing. Written to data/imported/health.json (saved with
// the data), to the run's GitHub summary, and to a public status page (status/index.html).
// Usage: node tools/health.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = join(root, 'data', 'imported');
export const RULES = { keepDays: 30, dropBelow: 0.5, minMedian: 5, failRuns: 3, staleHours: { scan: 12, daily: 30 } };
const read = (f) => { try { return JSON.parse(readFileSync(join(imp, f), 'utf8')); } catch { return null; } };
const len = (x) => (Array.isArray(x) ? x.length : 0);

// One row per source: what it brought and when it last answered.
export function measure({ disc = {}, importState = {}, xState = {}, models = [], datasets = [], research = {}, quarantine = {}, meta = {} } = {}) {
  const at = (s) => s || null;
  const d = (k) => disc[k] || {};
  return {
    'Hugging Face models (import)': { count: models.length, at: at(importState.huggingface_models), every: 'daily' },
    'Hugging Face datasets (import)': { count: datasets.length, at: at(importState.huggingface_datasets), every: 'daily' },
    'Ollama (import)': { count: models.filter((r) => (r.distributions || []).some((x) => x.source === 'ollama')).length, at: at(importState.ollama), every: 'daily' },
    'X': { count: len(read('x.json')?.announcements), at: at(xState.last_scan), every: 'scan', note: xState.day_reads != null ? `${xState.day_reads} reads today, ${xState.reads} this month` : '' },
    'Hugging Face new releases': { count: len(d('huggingface').models) + len(d('huggingface').datasets), at: at(d('huggingface').checked_at), every: 'scan' },
    'llm-releases.com': { count: len(d('llm_releases').hf_models), at: at(d('llm_releases').checked_at), every: 'scan' },
    'GitHub': { count: len(d('github').new_repos) + len(d('github').releases), at: at(d('github').checked_at), every: 'scan' },
    'YouTube': { count: len(d('youtube').videos) + len(d('youtube').search), at: at(d('youtube').checked_at), every: 'scan', note: `reviews for ${Object.values(d('youtube').reviews || {}).filter((v) => v.videos?.length).length} listings` },
    'OpenRouter': { count: d('openrouter').listed || 0, at: at(d('openrouter').checked_at), every: 'scan', note: `${len(d('openrouter').models)} new` },
    "Makers' news feeds": { count: len(d('maker_feeds').posts), at: at(d('maker_feeds').checked_at), every: 'scan', note: Object.entries(d('maker_feeds').diag || {}).filter(([, v]) => typeof v === 'string').map(([k, v]) => `${k}: ${v}`).join('; ') },
    'Hugging Face Daily Papers': { count: len(d('hf_papers').papers), at: at(d('hf_papers').checked_at), every: 'scan' },
    'Hacker News': { count: len(d('hacker_news').launches), at: at(d('hacker_news').checked_at), every: 'scan', quiet: true },
    'App Store searches': { count: len(d('app_store').apps), at: at(d('app_store').checked_at), every: 'daily' },
    'Product Hunt': { count: len(d('product_hunt').launches), at: at(d('product_hunt').checked_at), every: 'scan', skipped: d('product_hunt').skipped },
    'Replicate': { count: len(d('replicate').models), at: at(d('replicate').checked_at), every: 'scan', skipped: d('replicate').skipped },
    'Auto-research': { count: Object.values(research.apps || {}).filter((s) => s.record).length, at: at(research.checked_at), every: 'scan' },
    'Quarantined records': { count: len(quarantine.records), at: at(quarantine.checked_at), every: 'scan', bad: len(quarantine.records) > 0, note: (quarantine.records || []).slice(0, 5).map((q) => q.id).join(', ') },
    'Catalog': { count: Object.values(meta.counts || {}).reduce((a, b) => a + b, 0), at: at(meta.generated_at), every: 'scan' },
  };
}

// Flags: a count far below its recent median, a source that hasn't answered for too long, or quarantined records.
export function flags(now, row, history, name) {
  const out = [];
  if (row.skipped) return [`skipped: ${row.skipped}`];
  const past = history.map((h) => h.sources?.[name]?.count).filter((n) => typeof n === 'number').slice(-10).sort((a, b) => a - b);
  const median = past.length ? past[Math.floor(past.length / 2)] : null;
  if (!row.quiet && median != null && median >= RULES.minMedian && row.count < median * RULES.dropBelow) out.push(`dropped to ${row.count} (usually about ${median})`);
  const hours = row.at ? (now - new Date(row.at)) / 3600000 : Infinity;
  if (hours > RULES.staleHours[row.every === 'daily' ? 'daily' : 'scan']) out.push(row.at ? `not refreshed for ${Math.round(hours)} h` : 'never refreshed');
  if (row.bad) out.push(`${row.count} record(s) left out by validation`);
  return out;
}

export function report({ now = new Date(), rows, history }) {
  const flagged = Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, flags(now, r, history, k)]));
  return { at: now.toISOString(), rows, flagged, problems: Object.values(flagged).filter((f) => f.some((x) => !x.startsWith('skipped'))).length };
}

// "Needs you": what the pipeline can't fix by itself, each with why it matters and what would fix it.
// Worked out from the data each run, plus hand-kept items in data/needs-you.json. Never names a secret's value.
const REPO = 'https://github.com/jamalxcode/CleverFox';
const SECRETS = `${REPO}/settings/secrets/actions`;
export const KNOWN_BRANCHES = ['main', 'data', 'pages-cache'];
const names = (list, n = 6) => list.slice(0, n).join(', ') + (list.length > n ? ` and ${list.length - n} more` : '');
export function needsYou({ disc = {}, quarantine = {}, records = [], research = {}, env = {}, branches = null, site = '', hand = [], rep = null } = {}) {
  const out = [];
  // A secret counts as set when the workflow says so (HAS_<NAME>=true/false); without that, the source's own "skipped" note decides.
  const has = (k, skipped) => (env[`HAS_${k}`] === 'true' ? true : env[`HAS_${k}`] === 'false' ? false : !skipped);
  const key = (k, title, why, todo, link) => { if (!has(k, k === 'X_BEARER_TOKEN' ? false : /token|key/i.test(String(disc[{ REPLICATE_API_TOKEN: 'replicate', YOUTUBE_API_KEY: 'youtube', PRODUCT_HUNT_TOKEN: 'product_hunt' }[k]]?.skipped || '')))) out.push({ title, why, todo: `${todo} Then add it as the repository secret ${k}.`, link, kind: 'key' }); };
  if (env.HAS_X_BEARER_TOKEN === 'false') key('X_BEARER_TOKEN', 'Add the X API token', 'X is the main source for new announcements and for what people say about each listing.', 'Create a bearer token for an app at developer.x.com.', 'https://developer.x.com/en/portal/dashboard');
  key('REPLICATE_API_TOKEN', 'Add the Replicate token', "New models on Replicate then become candidate listings, and Replicate's models are matched to the ones already listed.", 'Sign in at replicate.com and create a token under Account → API tokens.', 'https://replicate.com/account/api-tokens');
  key('YOUTUBE_API_KEY', 'Add a YouTube Data API key', "Without it only makers' channel feeds are read: no keyword search and no reviews on listing pages.", 'Create an API key in Google Cloud with the YouTube Data API v3 turned on (the free quota is enough).', 'https://console.cloud.google.com/apis/library/youtube.googleapis.com');
  key('PRODUCT_HUNT_TOKEN', 'Add the Product Hunt token', "Product Hunt's AI launches then show on New this week.", 'Create an application at Product Hunt (API dashboard) and copy its developer token.', 'https://www.producthunt.com/v2/oauth/applications');
  if (/github\.io/.test(site)) out.push({ title: 'Point cleverfox.sala.company at the site', why: 'It is the planned address. Until then, links, feeds and previews use the github.io address.', todo: 'Where sala.company\'s DNS is managed, add a CNAME record "cleverfox" pointing to jamalxcode.github.io, then ask a Claude session to switch CleverFox over (CNAME file, site address, preview image).' });
  const ah = records.filter((r) => (r.type === 'app' || r.type === 'host') && r.verification_status !== 'verified');
  if (ah.length) out.push({ title: `Check ${ah.length} apps and hosts at their official pages`, why: 'Until then they show "not yet verified" and stay out of picks and guides.', todo: 'Run the "Fetch pages for verification" workflow, then ask a Claude session to review the saved pages and apply the verification.', link: `${REPO}/actions/workflows/fetch-pages.yml`, items: names(ah.map((r) => r.name)) });
  const off = records.filter((r) => r.access_check && ((r.access_check.facts || []).some((f) => f.status !== 'confirmed') || (r.access_check.broken || []).length));
  if (off.length) out.push({ title: `Re-check ${off.length} listings whose pages no longer show a listed fact`, why: 'The daily re-check found a free plan or a way to pay missing from its official page, or the page gone. Those listings show a warning meanwhile.', todo: 'Ask a Claude session to re-verify these listings against their official pages and update the facts.', items: names(off.map((r) => r.name)) });
  const q = quarantine.records || [];
  if (q.length) out.push({ title: `Look at ${q.length} records left out by validation`, why: 'Imported records that break a rule are kept out of the catalog until fixed.', todo: 'Ask a Claude session to read data/imported/quarantine.json on the data branch and fix the importer or add a correction.', items: names(q.map((x) => x.id)) });
  // Queued App Store apps auto-research couldn't fill (not the ones skipped as already listed).
  const appName = Object.fromEntries((disc.app_store?.apps || []).map((x) => [`apple:${x.id}`, x.name]));
  const gaps = Object.entries(research.apps || {}).filter(([, s]) => !s.record && !/already listed/.test(s.skipped || ''));
  if (gaps.length) out.push({ title: `Research ${gaps.length} queued apps by hand`, why: "Popular in app stores, but auto-research couldn't find enough on their own pages (for example, no website), so they aren't listed yet.", todo: 'Ask a Claude session to research them, or leave them.', items: names(gaps.map(([k, s]) => `${appName[k] || k}${s.skipped ? ` (${s.skipped})` : ''}`)), optional: true });
  if (rep) { const bad = Object.entries(rep.flagged).filter(([k, f]) => k !== 'Quarantined records' && f.some((x) => !x.startsWith('skipped'))); if (bad.length) out.push({ title: `${bad.length} source(s) need a look`, why: bad.map(([k, f]) => `${k}: ${f.join('; ')}`).join(' · '), todo: 'Often this fixes itself on the next pull. If it stays for a day, ask a Claude session to look at the run log.', link: `${REPO}/actions/workflows/pages.yml` }); }
  if (Array.isArray(branches)) { const old = branches.filter((b) => !KNOWN_BRANCHES.includes(b)); if (old.length) out.push({ title: `Delete ${old.length} old branch${old.length > 1 ? 'es' : ''}`, why: 'Left over from coding sessions.', todo: "Coding sessions may not delete branches: delete them on the repository's Branches page if they're no longer needed.", link: `${REPO}/branches/all`, items: names(old) }); }
  if (env.HAS_AA_API_KEY === 'false') out.push({ title: 'Add an Artificial Analysis key', why: "Adds Artificial Analysis scores beside Epoch AI's benchmarks.", todo: 'Get a free API key at artificialanalysis.ai, then add it as the repository secret AA_API_KEY.', link: 'https://artificialanalysis.ai/', optional: true });
  if (env.X_POST_ENABLED != null && env.X_POST_ENABLED !== 'true') out.push({ title: 'Turn on the weekly X post', why: "Every Monday, one post on X with what's new.", todo: `${env.HAS_X_POST_KEYS === 'true' ? '' : 'Add the X posting keys (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET, with write access) as secrets, then s'}${env.HAS_X_POST_KEYS === 'true' ? 'S' : ''}et the repository variable X_POST_ENABLED to true.`, link: `${REPO}/settings/variables/actions`, optional: true });
  for (const h of hand) if (h && h.title && !h.done) out.push({ title: String(h.title), why: String(h.why || ''), todo: String(h.todo || ''), link: h.link || '', optional: !!h.optional });
  return out;
}
function needsHtml(list) {
  const item = (n) => `<li class="need"><h3>${esc(n.title)}</h3>${n.why ? `<p>${esc(n.why)}</p>` : ''}${n.items ? `<p class="muted">${esc(n.items)}</p>` : ''}<p><strong>What to do:</strong> ${esc(n.todo)}${n.link ? ` <a href="${esc(n.link)}">Open</a>` : ''}</p></li>`;
  const must = list.filter((n) => !n.optional); const opt = list.filter((n) => n.optional);
  return `<section class="needs" aria-labelledby="needs-h"><h2 id="needs-h">🙋 Needs you</h2>
<p class="muted">What the robot can't fix on its own, and what would fix it.${list.length ? '' : ' Nothing right now.'}</p>
${must.length ? `<ul class="need-list">${must.map(item).join('')}</ul>` : ''}
${opt.length ? `<h3 class="need-sub">When you have time (optional)</h3><ul class="need-list">${opt.map(item).join('')}</ul>` : ''}</section>`;
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ago = (now, at) => { if (!at) return 'never'; const h = (now - new Date(at)) / 3600000; return h < 1 ? 'under an hour ago' : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`; };
// The last pulls (newest first), linked to their run when known.
function pulls(history, now) {
  const last = history.slice(-12).reverse(); if (!last.length) return '';
  const when = (t) => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return `<h2>🕒 Recent pulls</h2><div class="cmp-scroll"><table class="cmp status-table"><thead><tr><th scope="col">When (UTC)</th><th scope="col">Kind</th><th scope="col">Listings</th></tr></thead><tbody>${last.map((h) => `<tr><td>${h.run_id ? `<a href="${REPO}/actions/runs/${esc(h.run_id)}">${esc(when(h.run || h.at))}</a>` : esc(when(h.run || h.at))}</td><td>${esc({ full: 'full refresh', x: 'quick scan' }[h.mode] || h.mode || '')}</td><td>${esc(Number(h.sources?.Catalog?.count || 0).toLocaleString('en'))}</td></tr>`).join('')}</tbody></table></div>`;
}
export function statusPage(rep, history, now = new Date(), needs = []) {
  const rows = Object.entries(rep.rows).map(([k, r]) => { const f = rep.flagged[k]; const state = f.length ? (f.every((x) => x.startsWith('skipped')) ? '⏸️' : '⚠️') : '✅';
    const trend = history.slice(-8).map((h) => h.sources?.[k]?.count).filter((n) => typeof n === 'number').join(' → ');
    return `<tr><td>${state}</td><th scope="row">${esc(k)}</th><td>${esc(Number(r.count).toLocaleString('en'))}</td><td>${esc(ago(now, r.at))}</td><td class="muted">${esc([f.join('; '), r.note].filter(Boolean).join(' · '))}${trend ? `<br><span class="trend">recent: ${esc(trend)}</span>` : ''}</td></tr>`; }).join('');
  const build = (process.env.GITHUB_SHA || 'dev').slice(0, 7);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Status · CleverFox</title><meta name="description" content="Where CleverFox's data comes from and how each source is doing.">
<link rel="icon" type="image/png" sizes="32x32" href="../img/favicon-32.png?v=${build}"><link rel="stylesheet" href="../style.css?v=${build}">
<script>try { var l = localStorage.getItem('look'); if (l === 'light' || l === 'dim') document.documentElement.dataset.theme = l; } catch (e) {}</script>
</head><body>
<header class="top"><div class="wrap top-row"><a class="brand" href="../"><img src="../img/fox-logo.webp?v=${build}" alt="" width="40" height="40">CleverFox</a><nav class="page-nav" aria-label="Sections"><a href="../#start-h">🦊 Find</a><a href="../#browse">📚 Browse</a><a href="../new/">🆕 New this week</a><a href="../guides/">🧭 Guides</a><a href="../glossary/">📖 Glossary</a><a href="../status/">🩺 Status</a></nav></div><div class="wrap"><p><a href="../">← All listings</a></p></div></header>
<main class="wrap listing">
<h1>🩺 Data sources status</h1>
<p class="status-sum"><strong>${rep.problems ? `⚠️ ${rep.problems} source(s) need attention` : '✅ All fine'}</strong> · last pull ${esc(ago(now, history.at(-1)?.run || rep.at))} · ${needs.filter((n) => !n.optional).length ? `<a href="#needs-h">${needs.filter((n) => !n.optional).length} thing(s) need you</a>` : 'nothing needs you'}</p>
${needsHtml(needs)}
<h2>📡 Sources</h2>
<p class="muted">Checked ${esc(ago(now, rep.at))}. A source is flagged when its count falls below half its usual level, when it hasn't refreshed for too long, or when records are left out by validation. Counts are what each source holds now; the trend shows recent runs.</p>
<div class="cmp-scroll"><table class="cmp status-table"><thead><tr><th></th><th scope="col">Source</th><th scope="col">Count</th><th scope="col">Last answered</th><th scope="col">Notes</th></tr></thead><tbody>${rows}</tbody></table></div>
${pulls(history, now)}
</main>
<footer class="wrap foot"><p><a href="../">CleverFox</a> · <a href="../new/">New this week</a></p></footer>
<!-- GoatCounter analytics (not loaded on localhost; paths are prefixed with the host so all *.sala.company apps share one dashboard) -->
<script>
  (function () {
    if (/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(location.hostname)) return;
    window.goatcounter = { endpoint: 'https://salacompany.goatcounter.com/count', path: function (p) { return location.host + p; } };
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://salacompany.goatcounter.com/count');
    document.body.appendChild(s);
  })();
</script>
</body></html>
`;
}

async function main() {
  const now = new Date();
  const meta = (() => { try { return JSON.parse(readFileSync(join(root, 'data', 'meta.json'), 'utf8')); } catch { return {}; } })();
  const rows = measure({ disc: read('discover.json') || {}, importState: read('import-state.json') || {}, xState: read('x-state.json') || {}, models: read('models.json') || [], datasets: read('datasets.json') || [], research: read('autoresearch-state.json') || {}, quarantine: read('quarantine.json') || {}, meta });
  const prev = read('health.json') || { history: [] };
  const rep = report({ now, rows, history: prev.history || [] });
  // A new history entry only after a run that pulled data (not a plain deploy).
  const run = read('run-state.json') || {};
  const last = prev.history?.at(-1)?.run;
  const history = (prev.history || []).filter((h) => (now - new Date(h.at)) / 86400000 <= RULES.keepDays);
  if (run.last_run && run.last_run !== last) history.push({ at: now.toISOString(), run: run.last_run, run_id: process.env.GITHUB_RUN_ID || undefined, mode: run.last_mode, sources: Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, { count: r.count }])) });
  const records = (() => { try { return JSON.parse(readFileSync(join(root, 'data', 'catalog.json'), 'utf8')).records || []; } catch { return []; } })();
  const hand = (() => { try { return JSON.parse(readFileSync(join(root, 'data', 'needs-you.json'), 'utf8')).items || []; } catch { return []; } })();
  let branches = null;
  try { branches = execFileSync('git', ['ls-remote', '--heads', 'origin'], { cwd: root, encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').map((l) => l.split('refs/heads/')[1]).filter(Boolean); } catch {}
  const site = process.env.SITE_URL || 'https://jamalxcode.github.io/CleverFox/';
  const needs = needsYou({ disc: read('discover.json') || {}, quarantine: read('quarantine.json') || {}, records, research: read('autoresearch-state.json') || {}, env: process.env, branches, site, hand, rep });
  if (existsSync(imp)) writeFileSync(join(imp, 'health.json'), JSON.stringify({ ...rep, needs, history }, null, 1) + '\n');
  mkdirSync(join(root, 'status'), { recursive: true });
  writeFileSync(join(root, 'status', 'index.html'), statusPage(rep, history, now, needs));
  const lines = Object.entries(rep.rows).map(([k, r]) => `| ${rep.flagged[k].length ? (rep.flagged[k].every((x) => x.startsWith('skipped')) ? '⏸️' : '⚠️') : '✅'} | ${k} | ${r.count} | ${ago(now, r.at)} | ${[rep.flagged[k].join('; '), r.note].filter(Boolean).join(' · ')} |`);
  const md = `## Data sources\n\n${rep.problems ? `⚠️ ${rep.problems} source(s) need attention.` : '✅ Every source answered as expected.'}\n\n| | Source | Count | Last answered | Notes |\n|---|---|---|---|---|\n${lines.join('\n')}\n`;
  const needMd = needs.length ? `\n## Needs you\n\n${needs.map((n) => `- **${n.title}**${n.optional ? ' (optional)' : ''}: ${n.todo}${n.link ? ` [Open](${n.link})` : ''}`).join('\n')}\n` : '';
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + needMd);
  console.log(`Needs you: ${needs.filter((n) => !n.optional).length} (+${needs.filter((n) => n.optional).length} optional)${needs.length ? ': ' + needs.map((n) => n.title).join('; ') : ''}`);
  console.log(`Health: ${rep.problems} source(s) need attention${rep.problems ? ': ' + Object.entries(rep.flagged).filter(([, f]) => f.some((x) => !x.startsWith('skipped'))).map(([k, f]) => `${k} (${f.join('; ')})`).join(', ') : ''}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
