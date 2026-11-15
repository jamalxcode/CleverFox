// Validates the hand-entered seed records and writes the catalog the page loads.
// Usage: node tools/build.mjs [--check]   (--check validates without writing)
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';

// The live site's address. Change it when the custom domain (cleverfox.sala.company) is set.
const SITE = process.env.SITE_URL || 'https://jamalxcode.github.io/CleverFox/';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seedDir = join(root, 'data', 'seed');
const outFile = join(root, 'data', 'catalog.json');
const checkOnly = process.argv.includes('--check');

const VOCAB = {
  type: ['model', 'app', 'host', 'dataset'],
  verification_status: ['candidate', 'verified', 'check_failed'],
  warning: ['none', 'reported', 'dont_touch'],
  source_type: ['official', 'third_party', 'independently_verified', 'web_reported'],
  free: ['free', 'free_tier', 'trial', 'paid_only', 'unknown'],
  availability: ['announced', 'downloadable', 'gated', 'api_only', 'withdrawn', 'unknown'],
  dist_source: ['huggingface', 'ollama', 'api', 'aggregator', 'github', 'kaggle', 'modelscope'],
  method: ['card_international', 'card_local', 'paypal', 'crypto', 'mobile_money', 'upi', 'pix', 'alipay',
    'wechat_pay', 'bank_transfer', 'app_store_billing', 'prepaid_or_gift_card', 'carrier_billing', 'other'],
  kinds: ['gpu_cloud', 'vm', 'bare_metal', 'managed_hosting', 'inference_endpoint'],
};
const CARD_METHODS = new Set(['card_international', 'card_local']);
const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
// ISO 3166-1 alpha-2 codes, plus XK (Kosovo, user-assigned but widely used).
const ISO_CODES = ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT ' +
  'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
  'UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW').split(' ');
const ISO_SET = new Set(ISO_CODES);
const COUNTRY = { test: (c) => ISO_SET.has(c) };

const errors = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const isUnknown = (v) => v === 'unknown' || v === null;

function checkClaim(id, name, c, valueCheck) {
  if (c === null || c === undefined) return err(id, `${name} is missing (use a claim with value "unknown")`);
  if (typeof c !== 'object' || !('value' in c)) return err(id, `${name} is not a claim object`);
  if (!c.observed_at || !ISO_TS.test(c.observed_at)) err(id, `${name}.observed_at must be an ISO UTC timestamp`);
  if (isUnknown(c.value)) return;
  if (!c.source_url || !/^https?:\/\//.test(c.source_url)) err(id, `${name} has a value but no source_url`);
  if (!VOCAB.source_type.includes(c.source_type)) err(id, `${name}.source_type "${c.source_type}" is not allowed`);
  if (valueCheck) {
    const problem = valueCheck(c.value);
    if (problem) err(id, `${name}: ${problem}`);
  }
}

const countryList = (v) => (Array.isArray(v) && v.every((c) => COUNTRY.test(c))) ? null : 'must be a list of ISO country codes';

function checkAccess(id, where, a) {
  if (!a || typeof a !== 'object') return err(id, `${where} access block is missing`);
  checkClaim(id, `${where}.free`, a.free, (v) => VOCAB.free.includes(v) ? null : `"${v}" not in vocabulary`);
  checkClaim(id, `${where}.payment_methods`, a.payment_methods, (v) => {
    if (!Array.isArray(v)) return 'must be a list';
    const bad = v.filter((m) => !VOCAB.method.includes(m.method)).map((m) => m.method);
    return bad.length ? `unknown methods ${bad.join(', ')}` : null;
  });
  checkClaim(id, `${where}.countries_available`, a.countries_available,
    (v) => v === 'all_except_listed' ? null : countryList(v));
  checkClaim(id, `${where}.countries_unavailable`, a.countries_unavailable, countryList);
  checkClaim(id, `${where}.signup_requirements`, a.signup_requirements);
  checkClaim(id, `${where}.local_currency_pricing`, a.local_currency_pricing,
    (v) => typeof v === 'boolean' ? null : 'must be true, false or "unknown"');
}

// Derived: true when a free option or a non-card payment method exists.
function noCardNeeded(a) {
  if (!a) return 'unknown';
  if (['free', 'free_tier'].includes(a.free?.value)) return true;
  const pm = a.payment_methods?.value;
  if (Array.isArray(pm) && pm.some((m) => !CARD_METHODS.has(m.method))) return true;
  if (Array.isArray(pm) && pm.length) return false;
  return 'unknown';
}

// Hand-researched seed records, then records imported from Hugging Face and other directories
// (tools/import.mjs). The importer already skips anything the seed covers.
const importDir = join(root, 'data', 'imported');
const sourceFiles = [
  ...readdirSync(seedDir).filter((f) => f.endsWith('.json')).sort().map((f) => join(seedDir, f)),
  ...(existsSync(importDir) ? readdirSync(importDir).filter((f) => ['models.json', 'datasets.json'].includes(f)).sort().map((f) => join(importDir, f)) : []),
];
const records = sourceFiles.flatMap((f) => {
  const data = JSON.parse(readFileSync(f, 'utf8'));
  if (!Array.isArray(data)) throw new Error(`${f} must hold a JSON array`);
  return data;
});

const seenIds = new Set();
const seenDist = new Map();
const seenDomain = new Map();
const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } };

for (const r of records) {
  const id = r.id || '(no id)';
  if (r.schema_version !== 1) err(id, 'schema_version must be 1');
  if (!VOCAB.type.includes(r.type)) err(id, `type "${r.type}" is not allowed`);
  const idRe = r.type === 'host' ? /^cf:host:[a-z0-9-]+$/ : new RegExp(`^cf:${r.type}:[a-z0-9-]+/[a-z0-9.-]+$`);
  if (!idRe.test(id)) err(id, 'id does not match the cf:<type>:... pattern');
  if (seenIds.has(id)) err(id, 'duplicate id');
  seenIds.add(id);
  for (const f of ['name', 'description', 'publisher']) if (!r[f]) err(id, `${f} is missing`);
  if (r.description && r.description.split(/\s+/).length > 30) err(id, 'description is longer than 30 words');
  for (const f of ['official_urls', 'documentation_urls', 'evidence_urls', 'relations']) {
    if (!Array.isArray(r[f])) err(id, `${f} must be a list`);
  }
  if (!r.official_urls?.length) err(id, 'needs at least one official URL');
  if (!VOCAB.verification_status.includes(r.verification_status)) err(id, 'bad verification_status');
  if (!VOCAB.warning.includes(r.warning)) err(id, 'bad warning');
  for (const f of ['first_seen_at', 'last_content_change_at']) if (!ISO_TS.test(r[f] || '')) err(id, `${f} must be an ISO UTC timestamp`);
  checkClaim(id, 'publisher_region', r.publisher_region, (v) => COUNTRY.test(v) ? null : 'must be an ISO country code');

  if (r.type === 'model') {
    for (const c of ['license', 'availability', 'parameters', 'released_at', 'languages']) checkClaim(id, c, r[c]);
    if (r.availability && !isUnknown(r.availability.value) && !VOCAB.availability.includes(r.availability.value)) err(id, 'bad availability value');
    if (!Array.isArray(r.distributions) || !r.distributions.length) err(id, 'needs at least one distribution');
    for (const d of r.distributions || []) {
      if (!VOCAB.dist_source.includes(d.source)) err(id, `distribution source "${d.source}" not allowed`);
      if (!d.url) err(id, 'distribution without url');
      const key = d.url && d.url.replace(/\/$/, '').toLowerCase();
      if (key && seenDist.has(key) && seenDist.get(key) !== id) err(id, `distribution URL also used by ${seenDist.get(key)}`);
      if (key) seenDist.set(key, id);
      const nkey = `${d.source}:${d.native_id}`.toLowerCase();
      if (d.native_id && seenDist.has(nkey) && seenDist.get(nkey) !== id) err(id, `native id ${nkey} also used by ${seenDist.get(nkey)}`);
      if (d.native_id) seenDist.set(nkey, id);
      if (['api', 'aggregator'].includes(d.source)) checkAccess(id, `distribution ${d.native_id}`, d.access);
    }
    if (typeof r.local_ready !== 'boolean') err(id, 'local_ready must be true or false');
  } else if (r.type === 'dataset') {
    for (const c of ['license', 'availability', 'languages']) checkClaim(id, c, r[c]);
    if (!Array.isArray(r.tasks)) err(id, 'tasks must be a list');
  } else {
    checkAccess(id, 'record', r.access);
    const site = r.type === 'app' ? r.url : r.launch_url || r.official_urls?.[0];
    const dom = domainOf(site);
    if (!dom) err(id, 'missing or invalid site URL');
    const dkey = `${r.type}:${dom}`;
    if (dom && seenDomain.has(dkey)) err(id, `same site domain as ${seenDomain.get(dkey)}`);
    if (dom) seenDomain.set(dkey, id);
  }
  if (r.type === 'app') {
    if (!Array.isArray(r.categories) || !r.categories.length) err(id, 'app needs categories');
    checkClaim(id, 'interface_languages', r.interface_languages);
  }
  if (r.type === 'host') {
    checkClaim(id, 'provider_region', r.provider_region);
    checkClaim(id, 'data_centers', r.data_centers, (v) => Array.isArray(v) && v.every((d) => COUNTRY.test(d.country)) ? null : 'each data center needs an ISO country');
    checkClaim(id, 'gpu_types', r.gpu_types);
    checkClaim(id, 'data_residency', r.data_residency);
    if (!Array.isArray(r.kinds) || r.kinds.some((k) => !VOCAB.kinds.includes(k))) err(id, 'bad kinds');
  }
}

if (errors.length) {
  console.error(`${errors.length} problem(s) in ${records.length} seed records:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

// Publishable catalog: drop internal research notes, add derived fields and every cited URL to evidence.
function collectSources(obj, out) {
  if (!obj || typeof obj !== 'object') return;
  if (typeof obj.source_url === 'string') out.add(obj.source_url);
  for (const v of Object.values(obj)) collectSources(v, out);
}
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = ISO_CODES.map((code) => [code, regionNames.of(code) || code]);
countries.sort((x, y) => x[1].localeCompare(y[1]));

const prepared = records.map((r) => {
  const { research_notes, ...rec } = r;
  const sources = new Set(rec.evidence_urls);
  collectSources(rec, sources);
  rec.evidence_urls = [...sources];
  if (rec.access) rec.access.no_card_needed = noCardNeeded(rec.access);
  for (const d of rec.distributions || []) if (d.access) d.access.no_card_needed = noCardNeeded(d.access);
  return rec;
});

// ---- curation: corrections file, dataset quality bar, re-uploads grouped under their original ----
// Nothing is silently lost: hidden and grouped listings are recorded in catalog.json, and their old
// pages say where they went.
const CORRECTIONS = existsSync(join(root, 'data', 'corrections.json')) ? JSON.parse(readFileSync(join(root, 'data', 'corrections.json'), 'utf8')) : {};
const FORMAT_TAG = /^(fp8|fp16|bf16|fp4|nvfp4|mxfp4|int4|int8|w4a16|w8a8|gguf|awq|gptq|exl2|exl3|mlx|onnx|openvino|ov|\d+bit|q\d\w*|iq\d\w*|dynamic|quantized|quant)$/i;
const normName = (n) => n.toLowerCase().split(/[-_\s.]+/).filter(Boolean);
export function datasetQuality(r) {
  // A real dataset card: at least two of license, task, size, paper, language, its own summary. Very popular ones (100+ likes) pass.
  const likes = (r.popularity || []).reduce((n, p) => n + (p.likes || 0), 0);
  if (likes >= 100) return true;
  const signals = [r.license && !isUnknown(r.license.value), (r.tasks || []).length > 0, !!r.size_category, (r.paper_urls || []).length > 0,
    Array.isArray(r.languages?.value) && r.languages.value.length > 0, !/^Dataset published by [^.]+ on Hugging Face\.$/.test(r.description || '')];
  return signals.filter(Boolean).length >= 2;
}
function curate(all) {
  const hidden = []; const folded = [];
  const hide = new Map((CORRECTIONS.hide || []).map((h) => [h.id, h.reason]));
  const keep = new Set((CORRECTIONS.keep || []).map((k) => k.id));
  const merge = new Map((CORRECTIONS.merge || []).map((m) => [m.id, m]));
  let list = all.filter((r) => {
    if (hide.has(r.id)) { hidden.push({ id: r.id, name: r.name, reason: `correction: ${hide.get(r.id)}` }); return false; }
    if (r.type === 'dataset' && r.import_source && !keep.has(r.id) && !datasetQuality(r)) { hidden.push({ id: r.id, name: r.name, reason: 'below the dataset quality bar (no real dataset card)' }); return false; }
    return true;
  });
  // Group: a listed model's format re-uploads (name = its name + format tags only) or declared quantizations.
  const byName = new Map(list.filter((r) => r.type === 'model').map((r) => [normName(r.name).join(' '), r]));
  const byId = new Map(list.map((r) => [r.id, r]));
  const parentOf = (r) => {
    if (merge.has(r.id)) return byId.get(merge.get(r.id).into);
    if (r.type !== 'model' || !r.import_source) return null;
    const q = (r.relations || []).find((x) => x.type === 'quantization_of' && byId.has(x.target));
    if (q) return byId.get(q.target);
    const t = normName(r.name); let cut = t.length;
    while (cut > 1 && FORMAT_TAG.test(t[cut - 1])) cut--;
    if (cut === t.length) return null;
    const p = byName.get(t.slice(0, cut).join(' '));
    return p && p !== r ? p : null;
  };
  const moves = list.map((r) => [r, parentOf(r)]).filter(([, p]) => p);
  const gone = new Set();
  for (const [r, p] of moves) {
    if (gone.has(p.id)) continue; // never fold into something that is itself folded
    gone.add(r.id);
    const hf = (r.distributions || []).find((d) => d.source === 'huggingface');
    (p.variants ||= []).push({ id: r.id, name: r.name, publisher: r.publisher, url: hf?.url || r.official_urls?.[0], kind: merge.get(r.id)?.reason || 'format re-upload',
      downloads_30d: (r.popularity || []).reduce((n, x) => n + (x.downloads_30d || 0), 0), uncensored: !!r.uncensored });
    folded.push({ id: r.id, name: r.name, into: p.id });
  }
  list = list.filter((r) => !gone.has(r.id));
  for (const p of list) if (p.variants) p.variants.sort((a, b) => b.downloads_30d - a.downloads_30d);
  return { list, hidden, folded };
}
const CURATED = curate(prepared);
const published = CURATED.list;
console.log(`Curation: ${CURATED.folded.length} re-uploads grouped under their original, ${CURATED.hidden.length} hidden (${CURATED.hidden.filter((h) => h.reason.startsWith('correction')).length} by corrections)`);

// ---- answers to what people look for (spec section 12) ----
// Each answer is derived from stated fields; nothing here is a quality score.
const APP_CAPS = { chat: ['chat', 'writing'], writing: ['writing'], coding: ['coding'], image: ['images'], video: ['video'], audio: ['speech'], music: ['speech'], search: ['search'], research: ['search', 'reasoning'], productivity: ['writing'], translation: ['translation'], analytics: ['analytics'], agents: ['tools'] };
const TASK_CAPS = { 'text-generation': ['chat', 'writing'], 'image-text-to-text': ['vision', 'chat'], 'text-to-image': ['images'], 'automatic-speech-recognition': ['speech'], 'text-to-speech': ['speech'], 'feature-extraction': ['search'], 'sentence-similarity': ['search'], translation: ['translation'], 'text-to-video': ['video'], summarization: ['writing'] };
const PERMISSIVE = new Set(['mit', 'apache-2.0', 'bsd-3-clause', 'bsd-2-clause', 'cc-by-4.0', 'cc0-1.0', 'unlicense', 'openrail', 'cc-by-sa-4.0', 'odc-by', 'gpl-3.0', 'lgpl-3.0', 'agpl-3.0', 'mpl-2.0']);
const licenseKind = (v) => !v || v === 'unknown' ? 'unknown' : String(v).split(' / ').every((x) => PERMISSIVE.has(x)) ? 'open' : /nc|non-commercial|research/i.test(v) ? 'non_commercial' : 'restricted';
function answers(r) {
  let goodFor = r.capabilities;
  if (!goodFor) {
    const set = new Set();
    for (const t of r.tasks || []) for (const c of TASK_CAPS[t] || []) set.add(c);
    for (const c of r.categories || []) for (const x of APP_CAPS[c] || [c]) set.add(x);
    if (r.type === 'model' && /coder|code/i.test(r.name)) set.add('coding');
    goodFor = [...set].sort();
  }
  const access = r.access || (r.distributions || []).map((d) => d.access).find(Boolean) || null;
  const downloadable = (r.distributions || []).some((d) => ['downloadable', 'gated'].includes(d.availability)) || ['downloadable', 'gated'].includes(r.availability?.value);
  const free = downloadable ? 'free_download' : access && ['free', 'free_tier', 'trial'].includes(access.free?.value) ? access.free.value : access?.free?.value === 'paid_only' ? 'paid' : 'unknown';
  const gate = r.gate || (r.availability?.value === 'gated' ? 'login_and_terms' : 'none');
  const lic = licenseKind(r.license?.value);
  const barriers = [];
  if (gate === 'login_and_terms') barriers.push('Log in and accept terms to download');
  if (gate === 'approval') barriers.push('Download needs approval from the publisher');
  if (lic === 'non_commercial') barriers.push('License forbids commercial use');
  if (lic === 'restricted') barriers.push('Custom license with conditions');
  if (r.type === 'model' && !downloadable) barriers.push('Only through a paid or account-based API');
  if (access?.free?.value === 'paid_only') barriers.push('Paid only');
  if (access && access.no_card_needed === false) barriers.push('Paying needs a card');
  const signup = access?.signup_requirements?.value;
  if (signup && signup !== 'unknown' && /phone|id |identity|kyc|verification/i.test(signup)) barriers.push('Sign-up needs phone or ID verification');
  const unav = access?.countries_unavailable?.value;
  if (Array.isArray(unav) && unav.length) barriers.push(`Not available in ${unav.length} countries`);
  const noBarriers = r.type === 'model' || r.type === 'dataset' ? downloadable && gate === 'none' && lic === 'open' : r.type === 'app' ? ['free', 'free_tier'].includes(access?.free?.value) && !barriers.length : false;
  const bench = (r.benchmarks || []).length;
  return {
    good_for: goodFor,
    runs_locally: r.type === 'model' ? !!r.local_ready : null,
    free, gate, license_kind: lic, barriers, no_barriers: !!noBarriers,
    uncensored: !!r.uncensored,
    pay_without_card: access ? (Array.isArray(access.payment_methods?.value) ? access.payment_methods.value.some((m) => !['card_international', 'card_local'].includes(m.method)) : null) : null,
    benchmarks: bench,
    independent: (r.independent_benchmarks || []).length,
    x_praised: !!r.x_buzz?.praised,
  };
}
// ---- hardware estimates (spec section 12; rough, labeled as estimates) ----
// Memory to run a model locally ~ download size x 1.2 + 0.5 GB (weights plus working memory for an
// ordinary conversation length). Without a download size, from the parameter count: about 0.6 GB per
// billion parameters at 4-bit, 2 GB per billion at 16-bit. Never shown as a publisher's requirement.
const HW = { overhead: 1.2, extraGb: 0.5, q4PerB: 0.6, f16PerB: 2.0 };
const roundUp = (gb) => Math.max(1, Math.ceil(gb * 2) / 2);
// Recommended: the smallest standard memory size with ~25% headroom over the need (room for the
// operating system and longer conversations).
const MEMORY_SIZES = [4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024];
const recommend = (need) => MEMORY_SIZES.find((m) => m >= need * 1.25) || Math.ceil(need * 1.25 / 256) * 256;
function paramsInB(v) {
  if (!v || v === 'unknown') return [];
  return String(v).split(/,\s*/).map((x) => { const m = x.trim().match(/^([\d.]+)\s*([bm])\b/i); return m ? +m[1] * (m[2].toLowerCase() === 'm' ? 0.001 : 1) : null; }).filter((x) => x && x > 0);
}
function hardware(r) {
  if (r.type !== 'model') return null;
  const local = (r.distributions || []).filter((d) => d.file_size_bytes);
  let options = local.map((d) => ({ label: d.native_id?.split(':')[1] || d.native_id, download_gb: +(d.file_size_bytes / 1e9).toFixed(1), memory_gb: roundUp(d.file_size_bytes / 1e9 * HW.overhead + HW.extraGb), basis: 'download size', source_url: d.url }));
  if (!options.length && (r.distributions || []).some((d) => ['downloadable', 'gated'].includes(d.availability))) {
    options = paramsInB(r.parameters?.value).flatMap((b) => [
      { label: `${b >= 1 ? +b.toFixed(1) + 'B' : Math.round(b * 1000) + 'M'} at 4-bit`, download_gb: null, memory_gb: roundUp(b * HW.q4PerB + HW.extraGb), basis: 'parameter count (4-bit quantized copy)', source_url: r.parameters?.source_url || null },
      { label: `${b >= 1 ? +b.toFixed(1) + 'B' : Math.round(b * 1000) + 'M'} at 16-bit`, download_gb: null, memory_gb: roundUp(b * HW.f16PerB + 1), basis: 'parameter count (full precision)', source_url: r.parameters?.source_url || null },
    ]);
  }
  if (!options.length) return null;
  for (const o of options) o.recommended_gb = recommend(o.memory_gb);
  options.sort((a, b) => a.memory_gb - b.memory_gb);
  return { min_memory_gb: options[0].memory_gb, recommended_gb: options[0].recommended_gb, options: options.slice(0, 8), moe: /\bA\d+(\.\d+)?B\b/.test(r.name) || (r.tags_seen || []).includes('moe') };
}
// ---- where it runs: from each runtime's documented platform support ----
// Platforms: windows, macos, linux, phone, cloud (a rented server, or the provider's own cloud for APIs and web apps).
const RUNTIMES = {
  ollama: { name: 'Ollama', platforms: ['windows', 'macos', 'linux'], docs: 'https://ollama.com/download' },
  'llama.cpp': { name: 'llama.cpp', platforms: ['windows', 'macos', 'linux'], docs: 'https://github.com/ggml-org/llama.cpp' },
  'onnx-runtime': { name: 'ONNX Runtime', platforms: ['windows', 'macos', 'linux', 'phone'], docs: 'https://onnxruntime.ai/' },
  mlx: { name: 'MLX', platforms: ['macos'], docs: 'https://github.com/ml-explore/mlx' },
  coreml: { name: 'Core ML', platforms: ['macos', 'phone'], docs: 'https://developer.apple.com/machine-learning/core-ml/' },
  tflite: { name: 'TensorFlow Lite', platforms: ['phone'], docs: 'https://ai.google.dev/edge/litert' },
  transformers: { name: 'Transformers (Python)', platforms: ['windows', 'macos', 'linux'], docs: 'https://huggingface.co/docs/transformers/installation' },
};
function platformsOf(r) {
  const via = new Set(r.local_runtimes || []);
  const formats = new Set([...(r.formats || []), ...(r.distributions || []).flatMap((d) => d.formats || [])]);
  if (formats.has('gguf')) via.add('llama.cpp');
  if (formats.has('mlx')) via.add('mlx');
  if (formats.has('onnx')) via.add('onnx-runtime');
  if (formats.has('tflite')) via.add('tflite');
  if (/coreml/i.test(r.name)) via.add('coreml');
  if (formats.has('safetensors') || formats.has('pytorch')) via.add('transformers');
  const downloadable = (r.distributions || []).some((d) => ['downloadable', 'gated'].includes(d.availability));
  const out = { windows: [], macos: [], linux: [], phone: [], cloud: [] };
  for (const v of via) for (const p of RUNTIMES[v]?.platforms || []) out[p].push(v);
  if (r.type === 'model' && downloadable) out.cloud.push('rented server');
  if ((r.distributions || []).some((d) => ['api', 'aggregator'].includes(d.source))) out.cloud.push('API');
  if (r.type === 'app') { out.cloud.push('web'); if (r.app_store_urls?.length) out.phone.push('app store'); }
  const list = Object.fromEntries(Object.entries(out).filter(([, v]) => v.length));
  return Object.keys(list).length ? list : null;
}
const runtimeDocs = Object.fromEntries(Object.entries(RUNTIMES).map(([k, v]) => [k, { name: v.name, docs: v.docs }]));
for (const r of published) { const pl = platformsOf(r); if (pl) r.platforms = pl; }

// ---- independent benchmarks (tools/benchmarks.mjs: Epoch AI, Artificial Analysis) ----
// Matched by name with punctuation removed, also trying the name without an instruct/it/chat suffix
// and the Hugging Face repo name. No match -> nothing shown (never guessed).
const benchFile = join(importDir, 'benchmarks.json');
const BENCH = existsSync(benchFile) ? JSON.parse(readFileSync(benchFile, 'utf8')) : { models: {}, sources: {} };
const bkey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
let benchMatched = 0;
for (const r of published) {
  if (r.type !== 'model') continue;
  const names = [r.name, ...(r.distributions || []).filter((d) => ['huggingface', 'api'].includes(d.source)).map((d) => String(d.native_id).split('/').pop())];
  const keys = [...new Set(names.flatMap((n) => [bkey(n), bkey(String(n).replace(/[-_ ](instruct|it|chat|hf)$/i, ''))]))];
  const hit = keys.map((k) => BENCH.models[k]).find(Boolean);
  if (hit) { r.independent_benchmarks = hit.results; benchMatched++; }
}
if (BENCH.models && Object.keys(BENCH.models).length) console.log(`Independent benchmarks matched for ${benchMatched} models`);

// ---- what people say on X (tools/x.mjs): praise, criticism and top posts, by listing id ----
const xFile = join(importDir, 'x.json');
const XDATA = existsSync(xFile) ? JSON.parse(readFileSync(xFile, 'utf8')) : { buzz: {} };
let xMatched = 0;
for (const r of published) { const b = XDATA.buzz?.[r.id]; if (b) { r.x_buzz = b; xMatched++; } }
if (xMatched) console.log(`X buzz attached to ${xMatched} listings`);

for (const r of published) { r.answers = answers(r); const hw = hardware(r); if (hw) r.hardware = hw; }

const counts = Object.fromEntries(VOCAB.type.map((t) => [t, published.filter((r) => r.type === t).length]));
console.log(`OK: ${published.length} records (${counts.model} models, ${counts.dataset} datasets, ${counts.app} apps, ${counts.host} hosts)`);
if (!checkOnly) {
  const generated_at = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  // The page loads meta.json first, then only the listing type the visitor opens (page weight).
  // catalog.json holds everything, for anyone who wants the whole data set.
  writeFileSync(join(root, 'data', 'meta.json'), JSON.stringify({ schema_version: 1, generated_at, license: 'CC-BY-4.0', counts, countries, runtimes: runtimeDocs, benchmark_sources: BENCH.sources || {} }));
  // List files carry only what the list needs (cards, filters, search, sorting). Opening a card
  // fetches the listing's full record from its page folder (l/.../record.json).
  for (const t of VOCAB.type) writeFileSync(join(root, 'data', `${t}s.json`), JSON.stringify(published.filter((r) => r.type === t).map(slim)));
  writeFileSync(outFile, JSON.stringify({ schema_version: 1, generated_at, license: 'CC-BY-4.0', countries, records: published, grouped: CURATED.folded, hidden: CURATED.hidden }));
  console.log(`Wrote data/meta.json, data/{models,datasets,apps,hosts}.json and ${outFile.replace(root + '/', '')}`);
  writeListingPages(published, countries).then(() => writeMovedPages());
}

const GOATCOUNTER = `<!-- GoatCounter analytics (not loaded on localhost; paths are prefixed with the host so all *.sala.company apps share one dashboard) -->
<script>
  (function () {
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
    window.goatcounter = { endpoint: 'https://salacompany.goatcounter.com/count', path: function (p) { return location.host + p; } };
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://salacompany.goatcounter.com/count');
    document.body.appendChild(s);
  })();
</script>`;

// ---- a static page for every listing (shareable, previewable, findable) ----
async function writeListingPages(records, countryList) {
  const R = await import('../render.js');
  R.setCountries(countryList);
  R.view.runtimes = runtimeDocs;
  R.view.site = SITE;
  const build = (process.env.GITHUB_SHA || 'dev').slice(0, 7);
  const outRoot = join(root, 'l');
  rmSync(outRoot, { recursive: true, force: true });
  const urls = [SITE];
  for (const r of records) {
    const path = R.listingPath(r);
    const depth = path.split('/').filter(Boolean).length;
    const base = '../'.repeat(depth);
    R.view.base = base;
    const url = SITE + path;
    urls.push(url);
    const good = (r.answers?.good_for || []).map((c) => (R.CAPS[c] || c).replace(/^\S+\s/, ''));
    const facts = [good.length && `Good for ${good.slice(0, 4).join(', ').toLowerCase()}`, r.local_ready && 'runs locally', r.answers?.free === 'free_download' && 'free download', ['free', 'free_tier'].includes(r.answers?.free) && 'free tier', r.answers?.no_barriers && 'no barriers', r.hardware && `${r.hardware.recommended_gb} GB memory recommended`].filter(Boolean);
    const desc = `${r.description} ${facts.length ? facts.join(' · ') + '.' : ''}`.trim();
    const pub = r.publisher_name || r.publisher;
    const region = R.known(r.publisher_region) ? ` ${R.flag(r.publisher_region.value)}` : '';
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${R.esc(r.name)} · ${R.esc(pub)} · CleverFox</title>
<meta name="description" content="${R.esc(desc)}">
<link rel="canonical" href="${R.esc(url)}">
<link rel="icon" type="image/png" sizes="32x32" href="${base}img/favicon-32.png?v=${build}">
<link rel="apple-touch-icon" href="${base}img/apple-touch-icon.png?v=${build}">
<meta name="theme-color" content="#c2410c">
<meta property="og:title" content="${R.esc(r.name)} · CleverFox">
<meta property="og:description" content="${R.esc(desc)}">
<meta property="og:url" content="${R.esc(url)}">
<meta property="og:image" content="${SITE}img/og.jpg">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${base}style.css?v=${build}">
<script>try { const t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch (e) {}</script>
</head>
<body>
<header class="top">
  <div class="wrap top-row"><a class="brand" href="${base}"><img src="${base}img/fox-logo.webp?v=${build}" alt="" width="40" height="40">CleverFox</a></div>
  <div class="wrap"><p class="tagline"><a href="${base}#${r.type}">← All ${R.esc({ model: 'models', dataset: 'datasets', app: 'apps', host: 'hosting providers' }[r.type])}</a></p></div>
</header>
<main class="wrap listing">
  <div class="listing-grid">
  <article class="card card-page">
    <div class="card-head"><h1>${R.esc(r.name)}</h1><span class="pub">${R.esc(pub)}${region}</span></div>
    <p class="desc">${R.esc(r.description)}</p>
    ${R.goodForLine(r)}
    <div class="badges">${R.cardBadges(r)}</div>
    ${R.detail(r)}
  </article>
  ${R.xPanel(r)}
  </div>
</main>
<footer class="wrap foot">
  <p>Every fact links to its source and the date it was checked; "unknown" means we couldn't confirm it. Catalog data under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>${r.independent_benchmarks?.length ? ` · Benchmarks: ${[...new Set(r.independent_benchmarks.map((x) => x.source))].map((s) => s === 'Epoch AI' ? '<a href="https://epoch.ai/benchmarks">Epoch AI</a> (CC BY 4.0)' : '<a href="https://artificialanalysis.ai/">Artificial Analysis</a>').join(', ')}` : ''} · <a href="${base}">CleverFox</a></p>
</footer>
<script type="module">import { wireShare } from '${base}render.js?v=${build}'; wireShare(document);</script>
${r.x_buzz?.posts ? '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>' : ''}
${GOATCOUNTER}
</body>
</html>
`;
    mkdirSync(join(outRoot, path.slice(2)), { recursive: true });
    writeFileSync(join(outRoot, path.slice(2), 'index.html'), html);
    writeFileSync(join(outRoot, path.slice(2), 'record.json'), JSON.stringify(r));
  }
  writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${R.esc(u)}</loc></url>`).join('\n')}\n</urlset>\n`);
  writeFileSync(join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
  console.log(`Wrote ${records.length} listing pages under l/, sitemap.xml and robots.txt`);
}

// ---- slim list records (page weight; spec: first load under 200 KB) ----
function slimClaim(c) { return c && typeof c === 'object' && !Array.isArray(c) && 'value' in c ? { value: c.value } : c; }
function slimAccess(a) {
  if (!a) return a;
  return {
    countries_available: slimClaim(a.countries_available), countries_unavailable: slimClaim(a.countries_unavailable),
    free: slimClaim(a.free), no_card_needed: a.no_card_needed,
    payment_methods: Array.isArray(a.payment_methods?.value) ? { value: a.payment_methods.value.map((m) => ({ method: m.method })) } : slimClaim(a.payment_methods),
  };
}
export function slim(r) {
  if (r.type === 'app' || r.type === 'host') { const { research_notes, evidence_urls, ...rest } = r; return { ...rest, access: slimAccess(r.access) }; }
  const pop = r.popularity || [];
  const o = {
    id: r.id, type: r.type, name: r.name, publisher: r.publisher, publisher_name: r.publisher_name, family: r.family,
    description: r.description, tasks: r.tasks, warning: r.warning, verification_status: r.verification_status,
    languages: slimClaim(r.languages), publisher_region: slimClaim(r.publisher_region), availability: slimClaim(r.availability),
    license: slimClaim(r.license), parameters: slimClaim(r.parameters), local_ready: r.local_ready, size_category: r.size_category,
    answers: r.answers && { good_for: r.answers.good_for, no_barriers: r.answers.no_barriers, barriers: r.answers.barriers, x_praised: r.answers.x_praised,
      uncensored: r.answers.uncensored, benchmarks: r.answers.benchmarks, independent: r.answers.independent, free: r.answers.free },
    hardware: r.hardware && { min_memory_gb: r.hardware.min_memory_gb, recommended_gb: r.hardware.recommended_gb },
    platforms: r.platforms && Object.fromEntries(Object.keys(r.platforms).map((k) => [k, []])),
    popularity: pop.length ? [{ downloads_30d: pop.reduce((n, p) => n + (p.downloads_30d || 0) + pullsN(p.pulls), 0), likes: pop.reduce((n, p) => n + (p.likes || 0), 0) }] : undefined,
    independent_benchmarks: (r.independent_benchmarks || []).filter((x) => ['epoch_eci', 'aa_intelligence'].includes(x.id)).map((x) => ({ id: x.id, display: x.display })),
    distributions: (r.distributions || []).filter((d) => d.access || d.availability === 'downloadable').slice(0, 3).map((d) => ({ source: d.source, availability: d.availability, access: slimAccess(d.access) })),
    paper_urls: r.paper_urls?.length ? [r.paper_urls[0]] : undefined,
    variants: r.variants?.length ? r.variants.length : undefined,
  };
  return JSON.parse(JSON.stringify(o));
}
function pullsN(s) { const m = String(s || '').match(/^([\d.]+)([KMB]?)$/); return m ? +m[1] * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]] || 1) : 0; }

// Pages for listings that were grouped or hidden: say where they went (old links keep working).
function writeMovedPages() {
  const path = (id) => `l/${id.replace(/^cf:/, '').replace(':', '/')}/`;
  const page = (title, body, target) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · CleverFox</title><meta name="robots" content="noindex">${target ? `<link rel="canonical" href="${SITE}${target}"><meta http-equiv="refresh" content="0; url=${SITE}${target}">` : ''}<style>body{font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 16px}</style></head><body>${body}</body></html>`;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  for (const f of CURATED.folded) {
    const dir = join(root, path(f.id)); mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), page(esc(f.name), `<p>${esc(f.name)} is listed as another version of <a href="${SITE}${path(f.into)}">its original model</a>.</p>`, path(f.into)));
  }
  for (const h of CURATED.hidden) {
    const dir = join(root, path(h.id)); mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), page(esc(h.name), `<p>${esc(h.name)} is no longer listed on CleverFox: ${esc(h.reason)}.</p><p><a href="${SITE}">Back to CleverFox</a></p>`));
  }
}
