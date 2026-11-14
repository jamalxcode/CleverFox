// Imports models and datasets from Hugging Face and local models from the Ollama library into
// data/imported/*.json, in the catalog's record format. Facts come from the sources' own
// metadata; anything they don't state stays "unknown". Links found in model and dataset cards
// (papers, GitHub, documentation) are kept as documentation and paper links.
//
// Usage: node tools/import.mjs [--quick]     (--quick: small limits, for testing)
// Env: HF_TOKEN (optional, raises Hugging Face rate limits)
//
// Safety (Flattery's lesson): if a source fails or returns far fewer records than last time,
// the previous file is kept, so a bad run never shrinks the catalog.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'data', 'imported');
const QUICK = process.argv.includes('--quick');
const NOW = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const TODAY = NOW.slice(0, 10) + 'T00:00:00Z'; // observed_at at day precision: unchanged facts don't churn the files
const HF = 'https://huggingface.co';
const HF_HEADERS = process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {};

// ---- inclusion rules (provisional; spec section 4) ----
const RULES = QUICK ? { topModels: 20, likedModels: 10, trendingModels: 10, perLanguageModels: 2, topDatasets: 15, likedDatasets: 5, perLanguageDatasets: 1, readmes: 40 }
  : { topModels: 250, likedModels: 120, trendingModels: 120, perLanguageModels: 10, topDatasets: 150, likedDatasets: 80, perLanguageDatasets: 6, readmes: 2000 };
const MIN_DOWNLOADS_GAP = 200; // gap rule: models/datasets for underrepresented languages need only this many downloads
const TASKS = ['text-generation', 'image-text-to-text', 'text-to-image', 'automatic-speech-recognition', 'text-to-speech', 'feature-extraction', 'sentence-similarity', 'translation', 'image-to-text', 'text-to-video', 'image-to-image', 'audio-text-to-text', 'any-to-any', 'summarization', 'text-classification'];
// Gap languages: non-English languages with fewer models (spec focus: beyond the USA).
const GAP_LANGUAGES = ['ar', 'fa', 'ur', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'sw', 'yo', 'ha', 'ig', 'am', 'zu', 'xh', 'so', 'id', 'ms', 'tl', 'vi', 'th', 'my', 'km', 'tr', 'kk', 'uz', 'he', 'ne', 'si', 'pt', 'es', 'fr', 'ru', 'uk', 'pl', 'ja', 'ko', 'zh'];
const MODALITIES = { 'text-generation': ['text'], 'image-text-to-text': ['text', 'image'], 'text-to-image': ['text', 'image'], 'automatic-speech-recognition': ['audio', 'text'], 'text-to-speech': ['text', 'audio'], 'feature-extraction': ['text'], 'sentence-similarity': ['text'], translation: ['text'], 'image-to-text': ['image', 'text'], 'text-to-video': ['text', 'video'], 'image-to-image': ['image'], 'audio-text-to-text': ['audio', 'text'], 'any-to-any': ['text', 'image', 'audio'], summarization: ['text'], 'text-classification': ['text'] };
const TASK_WORDS = { 'text-generation': 'Text-generation', 'image-text-to-text': 'Vision-language', 'text-to-image': 'Text-to-image', 'automatic-speech-recognition': 'Speech-recognition', 'text-to-speech': 'Text-to-speech', 'feature-extraction': 'Embedding', 'sentence-similarity': 'Sentence-embedding', translation: 'Translation', 'image-to-text': 'Image-to-text', 'text-to-video': 'Text-to-video', 'image-to-image': 'Image-to-image', 'audio-text-to-text': 'Audio-language', 'any-to-any': 'Multimodal', summarization: 'Summarization', 'text-classification': 'Text-classification' };

// ---- helpers ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, { json = true, headers = {}, tries = 4 } = {}) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'CleverFox catalog importer', ...headers } }).catch((e) => ({ ok: false, status: 0, err: e }));
    if (res.ok) return json ? res.json() : res.text();
    if (res.status === 404) return null;
    const wait = res.status === 429 ? Number(res.headers?.get?.('retry-after') || 30) * 1000 : 1500 * 2 ** i;
    await sleep(Math.min(wait, 60000));
  }
  throw new Error(`failed: ${url}`);
}
async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
const claim = (value, source_url, source_type = 'official') => (value === 'unknown' || value === null || value === undefined || (Array.isArray(value) && !value.length))
  ? { value: 'unknown', source_url: null, source_type: null, observed_at: TODAY }
  : { value, source_url, source_type, observed_at: TODAY };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').replace(/\.{2,}/g, '.') || 'x';
const ownerSlug = (s) => slug(s).replace(/\./g, '-');
const tagValues = (tags, prefix) => (tags || []).filter((t) => t.startsWith(prefix)).map((t) => t.slice(prefix.length));
const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []).filter((x) => typeof x === 'string');
const ISO639_1 = /^[a-z]{2,3}$/;
function fmtParams(n) { if (!n) return 'unknown'; return n >= 1e9 ? `${+(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B` : `${Math.round(n / 1e6)}M`; }
function licenseOf(card, tags, pageUrl) {
  const raw = asList(card?.license)[0] || tagValues(tags, 'license:')[0];
  if (!raw) return claim('unknown');
  if (['other', 'unknown'].includes(raw)) return card?.license_link ? claim('custom', card.license_link.startsWith('http') ? card.license_link : pageUrl) : claim('unknown');
  if (/^(llama|gemma|qwen|deepseek|falcon|mistral|apple|bigscience|openrail|creativeml|bigcode|deepfloyd|lfm|health|tongyi|exaone|nvidia|ai2|nous|intel)/.test(raw)) return claim('custom', pageUrl);
  return claim(raw, pageUrl);
}
function formatsOf(siblings, tags) {
  const f = new Set();
  for (const s of siblings || []) {
    const n = s.rfilename.toLowerCase();
    if (n.endsWith('.safetensors')) f.add('safetensors'); else if (n.endsWith('.gguf')) f.add('gguf'); else if (n.endsWith('.onnx')) f.add('onnx'); else if (n.endsWith('.bin') && n.includes('pytorch')) f.add('pytorch'); else if (n.endsWith('.tflite')) f.add('tflite');
  }
  if ((tags || []).includes('mlx')) f.add('mlx');
  return [...f].sort();
}
// Links worth keeping from a card's README: papers, code, documentation.
export function cardLinks(md) {
  const urls = [...new Set((md || '').match(/https?:\/\/[^\s)<>"'\]}`|]+/g) || [])].map((u) => u.replace(/[.,;:]+$/, ''));
  const papers = urls.filter((u) => /arxiv\.org\/(abs|pdf)\//.test(u)).map((u) => u.replace('/pdf/', '/abs/').replace(/\.pdf$/, '').replace(/v\d+$/, ''));
  const code = urls.filter((u) => /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(u) && !/github\.com\/(huggingface|ggerganov|ggml-org)\//i.test(u));
  const docs = urls.filter((u) => /(^https?:\/\/(docs|doc|developer|developers)\.|\/docs?\/|readthedocs|\.github\.io\/)/i.test(u) && !/huggingface\.co\/docs|shields\.io|badge/i.test(u));
  return { papers: [...new Set(papers)].slice(0, 5), code: [...new Set(code)].slice(0, 5), docs: [...new Set(docs)].slice(0, 5) };
}

// ---- Hugging Face models ----
const MODEL_EXPAND = ['cardData', 'tags', 'downloads', 'likes', 'pipeline_tag', 'author', 'gated', 'createdAt', 'lastModified', 'safetensors', 'siblings'].map((e) => `expand[]=${e}`).join('&');
async function listModels(params, limit) {
  const out = [];
  for (const task of TASKS) {
    const url = `${HF}/api/models?${params}&filter=${task}&limit=${limit}&${MODEL_EXPAND}`;
    out.push(...((await get(url, { headers: HF_HEADERS })) || []));
  }
  return out;
}
async function fetchModels() {
  const per = (n) => Math.max(2, Math.ceil(n / TASKS.length) * 2);
  const raw = [
    ...(await listModels('sort=downloads&direction=-1', per(RULES.topModels))),
    ...(await listModels('sort=likes&direction=-1', per(RULES.likedModels))),
    ...(await listModels('sort=trendingScore&direction=-1', per(RULES.trendingModels))),
  ];
  for (const lang of GAP_LANGUAGES) {
    const url = `${HF}/api/models?sort=downloads&direction=-1&language=${lang}&limit=${RULES.perLanguageModels * 3}&${MODEL_EXPAND}`;
    const list = ((await get(url, { headers: HF_HEADERS })) || []).filter((m) => (m.downloads || 0) >= MIN_DOWNLOADS_GAP && TASKS.includes(m.pipeline_tag));
    raw.push(...list.slice(0, RULES.perLanguageModels));
  }
  const byId = new Map();
  for (const m of raw) if (m?.id && !byId.has(m.id)) byId.set(m.id, m);
  return [...byId.values()];
}
const isQuantization = (m) => tagValues(m.tags, 'base_model:quantized:').length > 0;

function modelRecord(m, readme) {
  const page = `${HF}/${m.id}`;
  const api = `${HF}/api/models/${m.id}`;
  const card = m.cardData || {};
  const [owner, name] = m.id.split('/');
  const langs = asList(card.language).filter((l) => ISO639_1.test(l));
  const formats = formatsOf(m.siblings, m.tags);
  const links = cardLinks(readme);
  const papers = [...new Set([...tagValues(m.tags, 'arxiv:').map((a) => `https://arxiv.org/abs/${a}`), ...links.papers])];
  const rels = [];
  for (const [rel, type] of [['finetune', 'finetune_of'], ['adapter', 'adapter_of'], ['merge', 'merge_of'], ['quantized', 'quantization_of']]) {
    for (const base of tagValues(m.tags, `base_model:${rel}:`)) rels.push({ type, target_hf: base });
  }
  const runtimes = [formats.includes('gguf') && 'llama.cpp', formats.includes('mlx') && 'mlx', formats.includes('onnx') && 'onnx-runtime'].filter(Boolean);
  return {
    schema_version: 1,
    id: `cf:model:${ownerSlug(owner)}/${slug(name)}`,
    type: 'model',
    name,
    description: `${TASK_WORDS[m.pipeline_tag] || 'AI'} model published by ${m.author || owner} on Hugging Face${langs.length && !(langs.length === 1 && langs[0] === 'en') ? `, covering ${langs.length === 1 ? 'one language' : `${langs.length} languages`}` : ''}.`,
    publisher: m.author || owner,
    publisher_region: claim('unknown'),
    official_urls: [page],
    documentation_urls: [...links.code, ...links.docs],
    paper_urls: papers,
    evidence_urls: [api],
    verification_status: 'verified',
    warning: 'none',
    first_seen_at: TODAY,
    last_content_change_at: TODAY,
    relations: rels,
    family: card.base_model ? asList(card.base_model)[0]?.split('/').pop() || null : null,
    distributions: [{ source: 'huggingface', native_id: m.id, url: page, availability: m.gated ? 'gated' : 'downloadable', formats, file_size_bytes: null, access: null, observed_at: TODAY }],
    tasks: [m.pipeline_tag].filter(Boolean),
    modalities: MODALITIES[m.pipeline_tag] || [],
    languages: claim(langs.length ? langs : 'unknown', page),
    formats,
    local_runtimes: runtimes,
    local_ready: formats.some((f) => ['gguf', 'mlx', 'onnx', 'tflite'].includes(f)),
    official: true,
    license: licenseOf(card, m.tags, page),
    availability: claim(m.gated ? 'gated' : 'downloadable', page),
    parameters: claim(fmtParams(m.safetensors?.total), m.safetensors?.total ? api : null),
    released_at: claim('unknown'),
    announced_at: null,
    benchmarks: [],
    popularity: [{ source: 'huggingface', downloads_30d: m.downloads ?? null, likes: m.likes ?? null, observed_at: TODAY }],
    import_source: 'huggingface',
  };
}

// ---- Hugging Face datasets ----
const DATASET_EXPAND = ['cardData', 'tags', 'downloads', 'likes', 'author', 'gated', 'createdAt', 'lastModified'].map((e) => `expand[]=${e}`).join('&');
async function fetchDatasets() {
  const raw = [
    ...((await get(`${HF}/api/datasets?sort=downloads&direction=-1&limit=${RULES.topDatasets}&${DATASET_EXPAND}`, { headers: HF_HEADERS })) || []),
    ...((await get(`${HF}/api/datasets?sort=likes&direction=-1&limit=${RULES.likedDatasets}&${DATASET_EXPAND}`, { headers: HF_HEADERS })) || []),
  ];
  for (const lang of GAP_LANGUAGES) {
    const list = ((await get(`${HF}/api/datasets?sort=downloads&direction=-1&filter=language:${lang}&limit=${RULES.perLanguageDatasets * 3}&${DATASET_EXPAND}`, { headers: HF_HEADERS })) || [])
      .filter((d) => (d.downloads || 0) >= MIN_DOWNLOADS_GAP);
    raw.push(...list.slice(0, RULES.perLanguageDatasets));
  }
  const byId = new Map();
  // Skip the Hub's own documentation-asset repos: not datasets anyone would look for.
  for (const d of raw) if (d?.id && !byId.has(d.id) && !/^(huggingface|hf-internal-testing)\//.test(d.id)) byId.set(d.id, d);
  return [...byId.values()];
}
function datasetRecord(d, readme) {
  const page = `${HF}/datasets/${d.id}`;
  const api = `${HF}/api/datasets/${d.id}`;
  const card = d.cardData || {};
  const [owner, name] = d.id.split('/');
  const langs = [...new Set([...asList(card.language), ...tagValues(d.tags, 'language:')])].filter((l) => ISO639_1.test(l));
  const tasks = [...new Set([...asList(card.task_categories), ...tagValues(d.tags, 'task_categories:')])];
  const links = cardLinks(readme);
  const papers = [...new Set([...tagValues(d.tags, 'arxiv:').map((a) => `https://arxiv.org/abs/${a}`), ...links.papers])];
  return {
    schema_version: 1,
    id: `cf:dataset:${ownerSlug(owner)}/${slug(name)}`,
    type: 'dataset',
    name,
    description: `Dataset published by ${d.author || owner} on Hugging Face${tasks.length ? ` for ${tasks.slice(0, 2).join(' and ').replace(/-/g, ' ')}` : ''}${langs.length && !(langs.length === 1 && langs[0] === 'en') ? `, covering ${langs.length === 1 ? 'one language' : `${langs.length} languages`}` : ''}.`,
    publisher: d.author || owner,
    publisher_region: claim('unknown'),
    official_urls: [page],
    documentation_urls: [...links.code, ...links.docs],
    paper_urls: papers,
    evidence_urls: [api],
    verification_status: 'verified',
    warning: 'none',
    first_seen_at: TODAY,
    last_content_change_at: TODAY,
    relations: [],
    tasks,
    modalities: tagValues(d.tags, 'modality:'),
    formats: tagValues(d.tags, 'format:'),
    size_category: tagValues(d.tags, 'size_categories:')[0] || null,
    languages: claim(langs.length ? langs : 'unknown', page),
    license: licenseOf(card, d.tags, page),
    availability: claim(d.gated ? 'gated' : 'downloadable', page),
    popularity: [{ source: 'huggingface', downloads_30d: d.downloads ?? null, likes: d.likes ?? null, observed_at: TODAY }],
    import_source: 'huggingface',
  };
}

// ---- Ollama library ----
async function fetchOllama() {
  const html = await get('https://ollama.com/library?sort=popular', { json: false });
  const out = [];
  for (const block of html.split('href="/library/').slice(1)) {
    const name = block.match(/^([a-z0-9._-]+)"/)?.[1];
    if (!name || out.some((o) => o.name === name)) continue;
    const chips = [...block.matchAll(/<span\s+class="inline-flex[^"]*bg-(indigo|\[#ddf4ff\])[^"]*"[^>]*>([^<]+)<\/span>/g)].map((x) => [x[1], x[2].trim()]);
    const pulls = block.match(/<span[^>]*>([\d.]+[KMB]?)<\/span>\s*<span[^>]*>&nbsp;Pulls/)?.[1] || null;
    out.push({ name, capabilities: chips.filter((c) => c[0] === 'indigo').map((c) => c[1]), sizes: chips.filter((c) => c[0] !== 'indigo').map((c) => c[1].toLowerCase()), pulls });
  }
  return out;
}
const squash = (s) => s.toLowerCase().replace(/[-_.\s]/g, '').replace(/(instruct|chat|it|hf)$/g, '');
function attachOllama(models, families) {
  const byKey = new Map(models.map((r) => [squash(r.name), r]));
  const standalone = [];
  for (const fam of families) {
    let matched = 0;
    for (const size of fam.sizes) {
      const rec = byKey.get(squash(`${fam.name}${size}`));
      if (!rec || rec.distributions.some((d) => d.source === 'ollama')) continue;
      rec.distributions.push({ source: 'ollama', native_id: `${fam.name}:${size}`, url: `https://ollama.com/library/${fam.name}:${size}`, availability: 'downloadable', formats: ['gguf'], file_size_bytes: null, access: null, observed_at: TODAY });
      rec.local_ready = true;
      if (!rec.local_runtimes.includes('ollama')) rec.local_runtimes.push('ollama');
      if (!rec.formats.includes('gguf')) rec.formats = [...rec.formats, 'gguf'].sort();
      matched++;
    }
    if (matched) continue;
    const page = `https://ollama.com/library/${fam.name}`;
    const tasks = fam.capabilities.includes('embedding') ? ['feature-extraction'] : ['text-generation'];
    standalone.push({
      schema_version: 1, id: `cf:model:ollama-library/${slug(fam.name)}`, type: 'model', name: fam.name,
      description: `Local model in the Ollama library${fam.sizes.length ? ` in ${fam.sizes.length === 1 ? 'size' : 'sizes'} ${fam.sizes.join(', ')}` : ''}${fam.capabilities.length ? `, with ${fam.capabilities.join(', ')}` : ''}.`,
      publisher: 'Unknown (listed on Ollama)', publisher_region: claim('unknown'),
      official_urls: [page], documentation_urls: [], paper_urls: [], evidence_urls: ['https://ollama.com/library?sort=popular'],
      verification_status: 'verified', warning: 'none', first_seen_at: TODAY, last_content_change_at: TODAY, relations: [], family: fam.name,
      distributions: [{ source: 'ollama', native_id: fam.name, url: page, availability: 'downloadable', formats: ['gguf'], file_size_bytes: null, access: null, observed_at: TODAY }],
      tasks, modalities: fam.capabilities.includes('vision') ? ['text', 'image'] : ['text'], languages: claim('unknown'), formats: ['gguf'], local_runtimes: ['ollama'], local_ready: true, official: false,
      license: claim('unknown'), availability: claim('downloadable', page), parameters: claim(fam.sizes.length ? fam.sizes.join(', ') : 'unknown', fam.sizes.length ? page : null),
      released_at: claim('unknown'), announced_at: null, benchmarks: [], popularity: [{ source: 'ollama', pulls: fam.pulls, observed_at: TODAY }], import_source: 'ollama',
    });
  }
  return standalone;
}

// ---- seed overlap: hand-researched seed records win ----
function seedKeys() {
  const keys = new Set();
  const dir = join(root, 'data', 'seed');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    for (const r of JSON.parse(readFileSync(join(dir, f), 'utf8'))) {
      keys.add(r.id);
      for (const d of r.distributions || []) { keys.add(`${d.source}:${String(d.native_id).toLowerCase()}`); keys.add(d.url.replace(/\/$/, '').toLowerCase()); }
    }
  }
  return keys;
}

function keepOrWrite(file, records, label) {
  const path = join(outDir, file);
  const prev = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
  if (!QUICK && prev.length && records.length < prev.length * 0.8) {
    console.warn(`${label}: only ${records.length} records vs ${prev.length} last time; keeping the previous file.`);
    return prev.length;
  }
  // Keep first_seen_at from earlier runs; last_content_change_at moves only when content changed.
  const before = new Map(prev.map((r) => [r.id, r]));
  const strip = (r) => JSON.stringify({ ...r, first_seen_at: 0, last_content_change_at: 0, popularity: 0, observed: 0 }, (k, v) => (k === 'observed_at' ? 0 : v));
  for (const r of records) {
    const old = before.get(r.id);
    if (!old) continue;
    r.first_seen_at = old.first_seen_at;
    r.last_content_change_at = strip(old) === strip(r) ? old.last_content_change_at : TODAY;
  }
  records.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(path, JSON.stringify(records, null, 1) + '\n');
  return records.length;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const seed = seedKeys();
  const inSeed = (r) => seed.has(r.id) || r.distributions?.some((d) => seed.has(`${d.source}:${String(d.native_id).toLowerCase()}`) || seed.has(d.url.replace(/\/$/, '').toLowerCase()));

  let models = null; let datasets = null; let ollama = [];
  try {
    const raw = await fetchModels();
    const kept = raw.filter((m) => !isQuantization(m));
    console.log(`Hugging Face models: ${raw.length} fetched, ${kept.length} after skipping quantized copies`);
    const readmes = await pool(kept.slice(0, RULES.readmes), 6, (m) => get(`${HF}/${m.id}/raw/main/README.md`, { json: false, headers: HF_HEADERS, tries: 2 }).catch(() => null));
    models = kept.map((m, i) => modelRecord(m, readmes[i]));
  } catch (e) { console.warn(`Hugging Face models failed: ${e.message}`); }
  try { ollama = await fetchOllama(); console.log(`Ollama library: ${ollama.length} model families`); } catch (e) { console.warn(`Ollama failed: ${e.message}`); }
  try {
    const raw = await fetchDatasets();
    console.log(`Hugging Face datasets: ${raw.length} fetched`);
    const readmes = await pool(raw.slice(0, RULES.readmes), 6, (d) => get(`${HF}/datasets/${d.id}/raw/main/README.md`, { json: false, headers: HF_HEADERS, tries: 2 }).catch(() => null));
    datasets = raw.map((d, i) => datasetRecord(d, readmes[i]));
  } catch (e) { console.warn(`Hugging Face datasets failed: ${e.message}`); }

  if (models) {
    // Resolve relations to catalog ids where the base model is in the catalog.
    const idByHf = new Map(models.map((r) => [r.distributions[0].native_id, r.id]));
    for (const r of models) r.relations = r.relations.map((x) => ({ type: x.type, target: idByHf.get(x.target_hf) || `${HF}/${x.target_hf}` }));
    const standalone = ollama.length ? attachOllama(models, ollama) : [];
    const all = [...models, ...standalone].filter((r) => !inSeed(r));
    // de-duplicate ids
    const seen = new Set();
    const unique = all.filter((r) => (seen.has(r.id) ? false : seen.add(r.id)));
    console.log(`models written: ${keepOrWrite('models.json', unique, 'models')}`);
  }
  if (datasets) {
    const seen = new Set();
    const unique = datasets.filter((r) => !inSeed(r) && (seen.has(r.id) ? false : seen.add(r.id)));
    console.log(`datasets written: ${keepOrWrite('datasets.json', unique, 'datasets')}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
