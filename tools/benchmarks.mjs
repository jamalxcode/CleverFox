// Independent benchmark results for CleverFox listings, written to data/imported/benchmarks.json
// (saved with the other imports, so a failed download keeps the last good file).
//
// Sources:
//  - Epoch AI Benchmarking Hub (https://epoch.ai/benchmarks), CC BY 4.0: only Epoch's own data, i.e.
//    the Epoch Capabilities Index and Epoch's own runs. Results Epoch collected from other leaderboards
//    keep those leaderboards' licenses, so they are not used.
//  - Artificial Analysis free API (https://artificialanalysis.ai), attribution required: only when the
//    AA_API_KEY secret is set.
// MTEB (embeddings) publishes raw per-task results only; the site links to its leaderboard instead of
// computing an unofficial average.
//
// Usage: node tools/benchmarks.mjs     Env: AA_API_KEY (optional)
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'data', 'imported', 'benchmarks.json');
const TODAY = new Date().toISOString().slice(0, 10) + 'T00:00:00Z';
const EPOCH_ZIP = 'https://epoch.ai/data/benchmark_data.zip';
const EPOCH_PAGE = 'https://epoch.ai/benchmarks';
// Epoch's own runs: file -> label (scores are fractions; shown as %).
const EPOCH_RUNS = {
  'gpqa_diamond.csv': 'GPQA Diamond',
  'swe_bench_verified.csv': 'SWE-bench Verified',
  'math_level_5.csv': 'MATH Level 5',
  'otis_mock_aime_2024_2025.csv': 'AIME (mock)',
  'frontiermath_tiers_1_3_v2.csv': 'FrontierMath',
  'simpleqa_verified.csv': 'SimpleQA',
};

// "Qwen3-30B-A3B_none" / "kimi-k3.1-pro-together_max" -> "qwen330ba3b" / "kimik31pro"
export const benchKey = (name) => String(name).toLowerCase().split('_')[0]
  .replace(/-(together|fireworks|openrouter|deepinfra|fallback|vertex|bedrock|azure)$/g, '')
  .replace(/[^a-z0-9]/g, '');

export function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

async function epoch() {
  const res = await fetch(EPOCH_ZIP, { headers: { 'User-Agent': 'CleverFox catalog' } });
  if (!res.ok) throw new Error(`Epoch download: HTTP ${res.status}`);
  const dir = mkdtempSync(join(tmpdir(), 'epoch-'));
  writeFileSync(join(dir, 'b.zip'), Buffer.from(await res.arrayBuffer()));
  execFileSync('unzip', ['-q', '-o', join(dir, 'b.zip'), '-d', dir]);
  const models = {};
  const add = (name, entry) => { const k = benchKey(name); if (!k) return; (models[k] ||= { names: new Set(), results: {} }).names.add(name); const prev = models[k].results[entry.id]; if (!prev || entry.value > prev.value) models[k].results[entry.id] = entry; };
  const eciFile = join(dir, 'epoch_capabilities_index', 'eci_scores.csv');
  if (existsSync(eciFile)) {
    for (const r of parseCsv(readFileSync(eciFile, 'utf8'))) {
      const v = parseFloat(r.eci); if (!isFinite(v)) continue;
      add(r.Model, { id: 'epoch_eci', source: 'Epoch AI', label: 'Epoch Capabilities Index', value: +v.toFixed(1), display: String(Math.round(v)), detail: `90% range ${Math.round(+r.eci_ci_low)}–${Math.round(+r.eci_ci_high)}`, url: EPOCH_PAGE, observed_at: TODAY });
    }
  }
  for (const [file, label] of Object.entries(EPOCH_RUNS)) {
    const p = join(dir, file); if (!existsSync(p)) continue;
    for (const r of parseCsv(readFileSync(p, 'utf8'))) {
      const v = parseFloat(r['Best score (across scorers)'] || r.mean_score); if (!isFinite(v)) continue;
      add(r['Model version'], { id: `epoch_${file.replace('.csv', '')}`, source: 'Epoch AI', label, value: +v.toFixed(4), display: `${Math.round(v * 100)}%`, detail: 'run by Epoch AI', url: EPOCH_PAGE, observed_at: TODAY });
    }
  }
  return models;
}

async function artificialAnalysis(key) {
  const models = {};
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`https://artificialanalysis.ai/api/v2/language/models/free?page=${page}`, { headers: { 'x-api-key': key, 'User-Agent': 'CleverFox catalog' } });
    if (!res.ok) throw new Error(`Artificial Analysis: HTTP ${res.status}`);
    const body = await res.json();
    for (const m of body.data || []) {
      const ev = m.evaluations || {};
      const idx = ev.artificial_analysis_intelligence_index;
      if (typeof idx !== 'number') continue;
      const k = benchKey(m.name || m.slug);
      (models[k] ||= { names: new Set(), results: {} }).names.add(m.name);
      models[k].results.aa_intelligence = { id: 'aa_intelligence', source: 'Artificial Analysis', label: 'AA Intelligence Index', value: +idx.toFixed(1), display: String(Math.round(idx)), detail: `v${body.intelligence_index_version ?? ''}`.replace(/v$/, ''), url: `https://artificialanalysis.ai/models/${m.slug}`, observed_at: TODAY };
      for (const [f, label] of [['artificial_analysis_coding_index', 'AA Coding Index'], ['artificial_analysis_math_index', 'AA Math Index']]) {
        if (typeof ev[f] === 'number') models[k].results[f] = { id: f, source: 'Artificial Analysis', label, value: +ev[f].toFixed(1), display: String(Math.round(ev[f])), url: `https://artificialanalysis.ai/models/${m.slug}`, observed_at: TODAY };
      }
    }
    if (!body.data?.length || body.data.length < 20) break;
  }
  return models;
}

async function main() {
  const prev = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : { models: {} };
  const merged = {}; const sources = {};
  const take = (models, src) => { for (const [k, m] of Object.entries(models)) { const t = (merged[k] ||= { names: [], results: [] }); t.names = [...new Set([...t.names, ...m.names])]; t.results.push(...Object.values(m.results)); } sources[src] = true; };
  try { take(await epoch(), 'epoch'); } catch (e) { console.warn(`Epoch AI failed, keeping last data: ${e.message}`); for (const [k, m] of Object.entries(prev.models || {})) { const r = m.results.filter((x) => x.source === 'Epoch AI'); if (r.length) (merged[k] ||= { names: m.names, results: [] }).results.push(...r); } }
  if (process.env.AA_API_KEY) {
    try { take(await artificialAnalysis(process.env.AA_API_KEY), 'aa'); } catch (e) { console.warn(`Artificial Analysis failed, keeping last data: ${e.message}`); for (const [k, m] of Object.entries(prev.models || {})) { const r = m.results.filter((x) => x.source === 'Artificial Analysis'); if (r.length) (merged[k] ||= { names: m.names, results: [] }).results.push(...r); } }
  } else console.log('AA_API_KEY not set: Artificial Analysis skipped.');
  const count = Object.keys(merged).length;
  if (count < Object.keys(prev.models || {}).length * 0.8) { console.warn(`Only ${count} benchmarked models vs ${Object.keys(prev.models).length} last time; keeping the previous file.`); return; }
  mkdirSync(dirname(out), { recursive: true });
  const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)).map(([k, m]) => [k, { names: m.names.sort(), results: m.results.sort((a, b) => a.id.localeCompare(b.id)) }]));
  writeFileSync(out, JSON.stringify({ observed_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), sources: { epoch: { name: 'Epoch AI', url: EPOCH_PAGE, license: 'CC BY 4.0' }, aa: { name: 'Artificial Analysis', url: 'https://artificialanalysis.ai/', license: 'attribution required' } }, models: sorted }, null, 1) + '\n');
  console.log(`Benchmarks: ${count} models (${Object.keys(sources).join(', ')})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
