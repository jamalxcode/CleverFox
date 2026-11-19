// Pipeline health (decision 86): after each build, what every source brought this run, a 30-day history, and flags
// when a source drops well below its usual count or keeps failing. Written to data/imported/health.json (saved with
// the data), to the run's GitHub summary, and to a public status page (status/index.html).
// Usage: node tools/health.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
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

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ago = (now, at) => { if (!at) return 'never'; const h = (now - new Date(at)) / 3600000; return h < 1 ? 'under an hour ago' : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`; };
export function statusPage(rep, history, now = new Date()) {
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
<p class="muted">Checked ${esc(ago(now, rep.at))}. ${rep.problems ? `⚠️ ${rep.problems} source(s) need attention.` : '✅ Every source answered as expected.'} A source is flagged when its count falls below half its usual level, when it hasn't refreshed for too long, or when records are left out by validation. Counts are what each source holds now; the trend shows recent runs.</p>
<div class="cmp-scroll"><table class="cmp status-table"><thead><tr><th></th><th scope="col">Source</th><th scope="col">Count</th><th scope="col">Last answered</th><th scope="col">Notes</th></tr></thead><tbody>${rows}</tbody></table></div>
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
  if (run.last_run && run.last_run !== last) history.push({ at: now.toISOString(), run: run.last_run, mode: run.last_mode, sources: Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, { count: r.count }])) });
  if (existsSync(imp)) writeFileSync(join(imp, 'health.json'), JSON.stringify({ ...rep, history }, null, 1) + '\n');
  mkdirSync(join(root, 'status'), { recursive: true });
  writeFileSync(join(root, 'status', 'index.html'), statusPage(rep, history, now));
  const lines = Object.entries(rep.rows).map(([k, r]) => `| ${rep.flagged[k].length ? (rep.flagged[k].every((x) => x.startsWith('skipped')) ? '⏸️' : '⚠️') : '✅'} | ${k} | ${r.count} | ${ago(now, r.at)} | ${[rep.flagged[k].join('; '), r.note].filter(Boolean).join(' · ')} |`);
  const md = `## Data sources\n\n${rep.problems ? `⚠️ ${rep.problems} source(s) need attention.` : '✅ Every source answered as expected.'}\n\n| | Source | Count | Last answered | Notes |\n|---|---|---|---|---|\n${lines.join('\n')}\n`;
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log(`Health: ${rep.problems} source(s) need attention${rep.problems ? ': ' + Object.entries(rep.flagged).filter(([, f]) => f.some((x) => !x.startsWith('skipped'))).map(([k, f]) => `${k} (${f.join('; ')})`).join(', ') : ''}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
