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
const RULES = QUICK ? { topModels: 20, likedModels: 10, trendingModels: 10, perLanguageModels: 2, perUncensoredTerm: 3, topDatasets: 15, likedDatasets: 5, perLanguageDatasets: 1, readmes: 40 }
  : { topModels: 250, likedModels: 120, trendingModels: 120, perLanguageModels: 10, perUncensoredTerm: 30, topDatasets: 250, likedDatasets: 100, perLanguageDatasets: 6, readmes: 2000 };
const MIN_DOWNLOADS_GAP = 200; // gap rule: models/datasets for underrepresented languages need only this many downloads
const UNCENSORED_TERMS = ['abliterated', 'uncensored', 'heretic'];
const MIN_DOWNLOADS_UNCENSORED = 500; // uncensored rule: minimum downloads
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
  // Uncensored rule: the most downloaded abliterated / uncensored variants (spec section 4).
  for (const term of UNCENSORED_TERMS) {
    const url = `${HF}/api/models?search=${term}&sort=downloads&direction=-1&limit=${RULES.perUncensoredTerm * 3}&${MODEL_EXPAND}`;
    const list = ((await get(url, { headers: HF_HEADERS })) || []).filter((m) => (m.downloads || 0) >= MIN_DOWNLOADS_UNCENSORED && TASKS.includes(m.pipeline_tag) && isUncensored(m.id, m.tags));
    raw.push(...list.slice(0, RULES.perUncensoredTerm));
  }
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
    for (const base of tagValues(m.tags, `base_model:${rel}:`)) rels.push({ type: isUncensored(m.id, m.tags) && !/abliterat|uncensored|heretic/i.test(base) ? 'uncensored_variant_of' : type, target_hf: base });
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
    first_published: claim(m.createdAt ? m.createdAt.slice(0, 10) : 'unknown', api),
    announced_at: null,
    benchmarks: benchmarksOf(card, page),
    gate: gateOf(m.gated),
    uncensored: isUncensored(m.id, m.tags),
    tags_seen: (m.tags || []).filter((t) => USEFUL_TAGS.has(t)),
    popularity: [{ source: 'huggingface', downloads_30d: m.downloads ?? null, likes: m.likes ?? null, observed_at: TODAY }],
    import_source: 'huggingface',
  };
}
const USEFUL_TAGS = new Set(['conversational', 'moe', 'code', 'math', 'reasoning', 'function-calling', 'tool-use', 'agent']);

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
    first_published: claim(d.createdAt ? d.createdAt.slice(0, 10) : 'unknown', api),
    gate: gateOf(d.gated),
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
  return QUICK ? out.slice(0, 25) : out;
}
const toText = (h) => (h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
// Licenses named in an Ollama model page's License section.
const LICENSE_PATTERNS = [[/\bMIT License\b/i, 'mit'], [/\bApache(?: License)?,? (?:Version )?2\.0\b/i, 'apache-2.0'], [/\bGPL-?3/i, 'gpl-3.0'], [/CC[- ]BY[- ]NC[- ]4\.0/i, 'cc-by-nc-4.0'], [/CC[- ]BY[- ]4\.0/i, 'cc-by-4.0'],
  [/Llama \d(?:\.\d)? Community License/i, 'custom'], [/Gemma Terms of Use/i, 'custom'], [/Qwen (?:Research )?License/i, 'custom'], [/Tongyi Qianwen License/i, 'custom']];
export function ollamaLicense(pageHtml) {
  const t = toText(pageHtml);
  const i = t.search(/\bLicen[sc]e\b/);
  if (i < 0) return null;
  const section = t.slice(i, i + 600);
  const found = [...new Set(LICENSE_PATTERNS.filter(([re]) => re.test(section)).map(([, v]) => v))];
  return found.length ? found.join(' / ') : null;
}
// Per-size details from the tags page: download size, context window, input types.
export function ollamaTags(name, tagsHtml) {
  const t = toText(tagsHtml);
  const out = {};
  const re = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:([\\w.-]+)\\s+(?:latest\\s+)?[0-9a-f]{12}\\s*•\\s*([\\d.]+)\\s*(GB|MB|KB)\\s*•\\s*([\\d.]+[KM]?)\\s*context window\\s*•\\s*([A-Za-z, ]+?)\\s*input`, 'g');
  for (const m of t.matchAll(re)) {
    if (out[m[1]]) continue;
    const bytes = Math.round(parseFloat(m[2]) * { GB: 1e9, MB: 1e6, KB: 1e3 }[m[3]]);
    out[m[1]] = { bytes, context: m[4], inputs: m[5].split(/,\s*/).map((x) => x.trim().toLowerCase()) };
  }
  return out;
}
const QUANTIZERS = /^(bartowski|unsloth|thebloke|lmstudio-community|mlx-community|quantfactory|maziyarpanahi|second-state|ggml-org|mradermacher|nousresearch-gguf|tensorblock|bullerwins|devquasar|gaianet|qwen-gguf)$/i;
// "Llama-3.1-8B-Instruct" -> ["llama", "3.1", "8b", "instruct"]; "gemma3" -> ["gemma", "3"]
export const nameTokens = (s) => s.toLowerCase().replace(/_/g, '-').split('-').flatMap((p) => p.match(/[a-z]+|\d+(?:\.\d+)*[a-z]*/g) || []);
const squash = (s) => s.toLowerCase().replace(/[-_.\s]/g, '').replace(/(instruct|chat|it|hf)$/g, '');
// The original Hugging Face repo of an Ollama family: same name, not a quantizer's copy.
async function findUpstream(fam) {
  const list = (await get(`${HF}/api/models?search=${encodeURIComponent(fam.name)}&sort=downloads&direction=-1&limit=40&${MODEL_EXPAND}`, { headers: HF_HEADERS }).catch(() => null)) || [];
  const originals = list.filter((m) => !QUANTIZERS.test(m.author || '') && !isQuantization(m));
  const exact = originals.find((m) => squash(m.id.split('/')[1]) === squash(fam.name));
  if (exact) return { exact };
  // No repo named after the whole family: credit the publisher whose own repos start with the
  // family name (e.g. gemma3 -> google/gemma-3-4b-it, google/gemma-3-12b-it), if it has at least 2.
  const fam_t = nameTokens(fam.name);
  const starts = originals.filter((m) => {
    const t = nameTokens(m.id.split('/')[1]);
    if (t.length <= fam_t.length || !fam_t.every((x, i) => t[i] === x)) return false;
    return /^(\d+(\.\d+)?[bm]|v|it|instruct|chat|base|mini|small|medium|large|tiny|nano|vision|hf|preview)$/.test(t[fam_t.length]); // next word is a size or variant, not another version or product
  });
  const byAuthor = {};
  for (const m of starts) (byAuthor[m.author] ||= []).push(m);
  const best = Object.entries(byAuthor).filter(([, ms]) => ms.length >= 2).sort((a, b) => b[1].reduce((n, m) => n + (m.downloads || 0), 0) - a[1].reduce((n, m) => n + (m.downloads || 0), 0))[0];
  return best ? { author: best[0], repos: best[1].slice(0, 4) } : null;
}
async function enrichOllama(models, families) {
  const byKey = new Map(models.map((r) => [squash(r.name), r]));
  const byHf = new Map(models.map((r) => [r.distributions[0]?.native_id, r]));
  const extra = []; const standalone = [];
  await pool(families, 4, async (fam) => {
    const [page, tagsHtml] = await Promise.all([
      get(`https://ollama.com/library/${fam.name}`, { json: false, tries: 2 }).catch(() => ''),
      get(`https://ollama.com/library/${fam.name}/tags`, { json: false, tries: 2 }).catch(() => ''),
    ]);
    fam.license = ollamaLicense(page);
    fam.tags = ollamaTags(fam.name, tagsHtml);
  });
  const ollamaDist = (fam, tag) => ({ source: 'ollama', native_id: `${fam.name}:${tag}`, url: `https://ollama.com/library/${fam.name}:${tag}`, availability: 'downloadable', formats: ['gguf'], file_size_bytes: fam.tags?.[tag]?.bytes ?? null, context: fam.tags?.[tag]?.context ?? null, access: null, observed_at: TODAY });
  const addTo = (rec, fam, tags) => {
    for (const tag of tags) if (!rec.distributions.some((d) => d.native_id === `${fam.name}:${tag}`)) rec.distributions.push(ollamaDist(fam, tag));
    rec.local_ready = true;
    if (!rec.local_runtimes.includes('ollama')) rec.local_runtimes.push('ollama');
    if (!rec.formats.includes('gguf')) rec.formats = [...rec.formats, 'gguf'].sort();
    rec.ollama = { family: fam.name, capabilities: fam.capabilities, context: Object.values(fam.tags || {})[0]?.context || null };
  };
  for (const fam of families) {
    // 1. name + size match against imported Hugging Face models
    const sized = fam.sizes.filter((size) => byKey.has(squash(`${fam.name}${size}`)));
    for (const size of sized) addTo(byKey.get(squash(`${fam.name}${size}`)), fam, [size]);
    if (sized.length) continue;
    // 2. the family's original repo on Hugging Face
    const up = await findUpstream(fam);
    if (up?.exact) {
      let rec = byHf.get(up.exact.id);
      if (!rec) { rec = modelRecord(up.exact, null); extra.push(rec); byHf.set(up.exact.id, rec); }
      addTo(rec, fam, fam.sizes.length ? fam.sizes : ['latest']);
      continue;
    }
    // 3. listed on its own
    const page = `https://ollama.com/library/${fam.name}`;
    const inputs = new Set(Object.values(fam.tags || {}).flatMap((t) => t.inputs));
    const tasks = fam.capabilities.includes('embedding') ? ['feature-extraction'] : ['text-generation'];
    const rec = {
      schema_version: 1, id: `cf:model:ollama-library/${slug(fam.name)}`, type: 'model', name: fam.name,
      description: `Local model in the Ollama library${fam.sizes.length ? ` in ${fam.sizes.length === 1 ? 'size' : 'sizes'} ${fam.sizes.join(', ')}` : ''}${fam.capabilities.length ? `, with ${fam.capabilities.join(', ')}` : ''}.`,
      publisher: up?.author || 'Listed by Ollama', publisher_region: claim('unknown'),
      official_urls: [page, ...(up?.repos || []).map((m) => `${HF}/${m.id}`)], documentation_urls: [], paper_urls: [], evidence_urls: [page, `${page}/tags`, ...(up ? [`${HF}/${up.author}`] : [])],
      verification_status: 'verified', warning: 'none', first_seen_at: TODAY, last_content_change_at: TODAY, relations: [], family: fam.name,
      distributions: [], tasks, modalities: inputs.has('image') || fam.capabilities.includes('vision') ? ['text', 'image'] : ['text'],
      languages: claim('unknown'), formats: ['gguf'], local_runtimes: [], local_ready: true, official: false,
      license: fam.license ? claim(fam.license, page) : up?.repos?.[0] ? licenseOf(up.repos[0].cardData, up.repos[0].tags, `${HF}/${up.repos[0].id}`) : claim('unknown'),
      first_published: up?.repos?.length ? claim(up.repos.map((m) => m.createdAt).filter(Boolean).sort()[0]?.slice(0, 10) || 'unknown', `${HF}/api/models/${up.repos[0].id}`) : claim('unknown'),
      availability: claim('downloadable', page), parameters: claim(fam.sizes.length ? fam.sizes.join(', ') : 'unknown', fam.sizes.length ? page : null),
      released_at: claim('unknown'), announced_at: null, benchmarks: [], popularity: [{ source: 'ollama', pulls: fam.pulls, observed_at: TODAY }], import_source: 'ollama',
    };
    addTo(rec, fam, fam.sizes.length ? fam.sizes : ['latest']);
    standalone.push(rec);
  }
  return { extra, standalone };
}

// ---- answers to what people look for (spec section 12) ----
// "Good for": derived from the source's own task, tags and capability labels, never guessed from prose.
export function capabilitiesOf(r, tags = []) {
  const caps = new Set();
  const name = `${r.name} ${r.family || ''}`.toLowerCase();
  const t = new Set([...(r.tasks || []), ...tags.map((x) => x.toLowerCase())]);
  const has = (...xs) => xs.some((x) => t.has(x));
  if (has('text-generation', 'conversational')) caps.add('chat').add('writing');
  if (/\b(code|coder|coding|codestral|starcoder|devstral|codegemma|sql)\b/.test(name.replace(/[-_]/g, ' ')) || has('code')) caps.add('coding');
  if (/\b(math|mathstral)\b/.test(name.replace(/[-_]/g, ' ')) || has('math')) caps.add('math');
  if (/\b(r1|reason|reasoning|think|thinking|qwq)\b/.test(name.replace(/[-_]/g, ' ')) || has('reasoning') || r.ollama?.capabilities?.includes('thinking')) caps.add('reasoning');
  if (has('text-to-image', 'image-to-image')) caps.add('images');
  if (has('image-text-to-text', 'image-to-text', 'visual-question-answering') || r.ollama?.capabilities?.includes('vision') || (r.modalities || []).includes('image') && has('text-generation')) caps.add('vision');
  if (has('automatic-speech-recognition', 'text-to-speech', 'audio-text-to-text', 'text-to-audio')) caps.add('speech');
  if (has('text-to-video', 'image-to-video')) caps.add('video');
  if (has('translation')) caps.add('translation');
  if (has('feature-extraction', 'sentence-similarity') || r.ollama?.capabilities?.includes('embedding')) caps.add('search');
  if (has('table-question-answering', 'tabular-classification', 'tabular-regression', 'time-series-forecasting') || /\b(sql|table|tabular|chart|data)\b/.test(name.replace(/[-_]/g, ' '))) caps.add('analytics');
  if (r.ollama?.capabilities?.includes('tools') || has('function-calling', 'tool-use', 'agent')) caps.add('tools');
  if (has('summarization')) caps.add('writing');
  if (has('any-to-any')) caps.add('vision').add('speech');
  return [...caps].sort();
}
// Abliterated / uncensored variants: named or tagged as such by their publisher.
export const isUncensored = (name, tags = []) => /abliterat|uncensored|heretic|unfiltered|unaligned|decensored/i.test(`${name} ${tags.join(' ')}`);
// Gatekeeping on a download: Hugging Face "gated" is false, "auto" (log in and accept terms) or "manual" (approval).
export const gateOf = (gated) => gated === 'manual' ? 'approval' : gated ? 'login_and_terms' : 'none';
// Self-reported benchmark results from a model card's model-index.
export function benchmarksOf(card, page) {
  const out = [];
  const index = Array.isArray(card?.['model-index']) ? card['model-index'] : [];
  for (const entry of index) {
    for (const res of entry.results || []) {
      for (const met of res.metrics || []) {
        if (typeof met.value !== 'number' && typeof met.value !== 'string') continue;
        out.push({ benchmark: res.dataset?.name || res.dataset?.type || 'unknown', metric: met.name || met.type || '', value: met.value, conditions: [res.task?.type, res.dataset?.config, res.dataset?.split].filter(Boolean).join(', ') || null, source_url: page, source_type: 'official', self_reported: true, observed_at: TODAY });
        if (out.length >= 6) return out;
      }
    }
  }
  return out;
}
const PERMISSIVE = new Set(['mit', 'apache-2.0', 'bsd-3-clause', 'bsd-2-clause', 'cc-by-4.0', 'cc0-1.0', 'openrail', 'unlicense']);
// Highlights: short facts, each built from a stated field, with no free text from the card.
export function highlightsOf(r) {
  const h = [];
  const ctx = r.ollama?.context || r.distributions?.find((d) => d.context)?.context;
  if (ctx) h.push(`Context window of ${ctx} tokens (Ollama)`);
  if ((r.tags_seen || []).includes('moe') || /\bA\d+(\.\d+)?B\b/.test(r.name)) h.push('Mixture-of-experts: only part of the model runs for each token, so it is faster than its size suggests');
  if (r.capabilities?.includes('reasoning')) h.push('Reasoning or "thinking" model: works through problems step by step before answering');
  if (r.capabilities?.includes('tools')) h.push('Can call tools and functions (for agents and apps)');
  if (r.capabilities?.includes('vision')) h.push('Understands images as well as text');
  const langs = Array.isArray(r.languages?.value) ? r.languages.value : [];
  if (langs.length >= 5) h.push(`Covers ${langs.length} languages`);
  else if (langs.length && !(langs.length === 1 && langs[0] === 'en')) h.push(`Languages: ${langs.join(', ')}`);
  if (PERMISSIVE.has(r.license?.value)) h.push(`Permissive license (${r.license.value}): free for commercial use`);
  const smallest = (r.distributions || []).map((d) => d.file_size_bytes).filter(Boolean).sort((a, b) => a - b)[0];
  if (smallest) h.push(`Smallest local download: ${smallest >= 1e9 ? (smallest / 1e9).toFixed(1) + ' GB' : Math.round(smallest / 1e6) + ' MB'}`);
  if (r.uncensored) h.push('Uncensored / abliterated variant: refusals removed by its publisher');
  return h;
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

// Announcement posts from tools/x.mjs: Hugging Face id -> the most-liked post linking it, if it has
// at least the minimum engagement (data/imported/x.json).
function xAnnouncements(kind) {
  const p = join(outDir, 'x.json'); const out = new Map();
  if (!existsSync(p)) return out;
  for (const a of JSON.parse(readFileSync(p, 'utf8')).announcements || []) {
    if ((a.likes || 0) < 25) continue;
    for (const id of a.links?.[kind] || []) if (!out.has(id) || out.get(id).likes < a.likes) out.set(id, { source: 'x', url: a.url, author: a.author, likes: a.likes, created_at: a.created_at });
  }
  return out;
}

// Publisher names and countries from data/publishers.json (Wikidata, reviewed).
const PUBLISHERS = existsSync(join(root, 'data', 'publishers.json')) ? JSON.parse(readFileSync(join(root, 'data', 'publishers.json'), 'utf8')).publishers || {} : {};
function applyPublisher(r) {
  const account = r.official_urls?.[0]?.match(/huggingface\.co\/(?:datasets\/)?([^/]+)\//)?.[1] || (r.distributions || []).find((d) => d.source === 'huggingface')?.native_id?.split('/')[0] || r.publisher;
  const p = account && PUBLISHERS[account];
  if (!p) return;
  r.publisher_name = p.name;
  r.publisher_region = claim(p.country, p.source, 'third_party');
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const seed = seedKeys();
  const inSeed = (r) => seed.has(r.id) || r.distributions?.some((d) => seed.has(`${d.source}:${String(d.native_id).toLowerCase()}`) || seed.has(d.url.replace(/\/$/, '').toLowerCase()));

  let models = null; let datasets = null; let ollama = [];
  try {
    const raw = await fetchModels();
    // Plain quantized copies are skipped; an abliterated / uncensored package is a different model, so it stays.
    // Models announced on X (tools/x.mjs) with real engagement: confirmed on Hugging Face first.
    const xAnn = xAnnouncements('models');
    const have = new Set(raw.map((m) => m.id));
    for (const [id, post] of xAnn) {
      if (have.has(id)) { raw.find((m) => m.id === id).discovered_via = post; continue; }
      const m = await get(`${HF}/api/models/${id}?${MODEL_EXPAND}`, { headers: HF_HEADERS, tries: 2 }).catch(() => null);
      if (m?.id && TASKS.includes(m.pipeline_tag) && !QUANTIZERS.test(m.author || '')) { m.discovered_via = post; raw.push(m); have.add(m.id); }
    }
    if (xAnn.size) console.log(`X announcements: ${xAnn.size} linked models checked`);
    const kept = raw.filter((m) => !isQuantization(m) || isUncensored(m.id, m.tags));
    console.log(`Hugging Face models: ${raw.length} fetched, ${kept.length} after skipping quantized copies (${kept.filter((m) => isUncensored(m.id, m.tags)).length} uncensored)`);
    const readmes = await pool(kept.slice(0, RULES.readmes), 6, (m) => get(`${HF}/${m.id}/raw/main/README.md`, { json: false, headers: HF_HEADERS, tries: 2 }).catch(() => null));
    models = kept.map((m, i) => { const r = modelRecord(m, readmes[i]); if (m.discovered_via) r.discovered_via = m.discovered_via; return r; });
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
    const { extra, standalone } = ollama.length ? await enrichOllama(models, ollama) : { extra: [], standalone: [] };
    console.log(`Ollama: ${extra.length} families linked to their Hugging Face original, ${standalone.length} listed on their own`);
    const all = [...models, ...extra, ...standalone].filter((r) => !inSeed(r));
    for (const r of all) { r.capabilities = capabilitiesOf(r, r.tags_seen); r.highlights = highlightsOf(r); applyPublisher(r); }
    // de-duplicate ids
    const seen = new Set();
    const unique = all.filter((r) => (seen.has(r.id) ? false : seen.add(r.id)));
    console.log(`models written: ${keepOrWrite('models.json', unique, 'models')}`);
  }
  if (datasets) {
    const seen = new Set();
    // Quality bar (same rule as tools/build.mjs datasetQuality): a real dataset card, or 100+ likes.
    const real = (r) => (r.popularity || []).reduce((n, p) => n + (p.likes || 0), 0) >= 100 || [r.license && r.license.value !== 'unknown', (r.tasks || []).length > 0, !!r.size_category,
      (r.paper_urls || []).length > 0, Array.isArray(r.languages?.value) && r.languages.value.length > 0, !/^Dataset published by [^.]+ on Hugging Face\.$/.test(r.description || '')].filter(Boolean).length >= 2;
    const keepIds = new Set((existsSync(join(outDir, '..', 'corrections.json')) ? JSON.parse(readFileSync(join(outDir, '..', 'corrections.json'), 'utf8')).keep || [] : []).map((k) => k.id));
    const unique = datasets.filter((r) => !inSeed(r) && (real(r) || keepIds.has(r.id)) && (seen.has(r.id) ? false : seen.add(r.id)));
    for (const r of unique) { r.capabilities = capabilitiesOf(r, []); applyPublisher(r); }
    console.log(`datasets written: ${keepOrWrite('datasets.json', unique, 'datasets')}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
