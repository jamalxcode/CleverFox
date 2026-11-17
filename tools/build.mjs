// Validates the hand-entered seed records and writes the catalog the page loads.
// Usage: node tools/build.mjs [--check]   (--check validates without writing)
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';

// The live site's address. Change it when the custom domain (cleverfox.sala.company) is set.
const SITE = process.env.SITE_URL || 'https://jamalxcode.github.io/CleverFox/';
import { join, dirname } from 'node:path';
import { slim, isEstimate } from './slim.mjs';
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
  dist_source: ['huggingface', 'ollama', 'api', 'aggregator', 'github', 'kaggle', 'modelscope', 'replicate'],
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
  // Every link that becomes an href must be http(s).
  const isHttp = (u) => typeof u === 'string' && /^https?:\/\/[^\s"'<>]+$/i.test(u);
  for (const f of ['official_urls', 'documentation_urls', 'evidence_urls', 'paper_urls', 'app_store_urls']) for (const u of r[f] || []) if (!isHttp(u)) err(id, `${f} has a link that isn't http(s): ${String(u).slice(0, 60)}`);
  if (r.url != null && !isHttp(r.url)) err(id, `url isn't an http(s) link`);
  for (const d of r.distributions || []) if (d.url && !isHttp(d.url)) err(id, `distribution url isn't an http(s) link: ${String(d.url).slice(0, 60)}`);
  for (const f of ['official_urls', 'documentation_urls', 'evidence_urls', 'relations']) {
    if (!Array.isArray(r[f])) err(id, `${f} must be a list`);
  }
  if (!r.official_urls?.length) err(id, 'needs at least one official URL');
  if ('on_device' in r && typeof r.on_device !== 'boolean') err(id, 'on_device must be true or false');
  // Prices: separate observations (spec section 15): plan, amount, ISO currency, period, source, time.
  for (const p of r.access?.prices || []) {
    if (!p.plan || typeof p.amount !== 'number' || !/^[A-Z]{3}$/.test(p.currency || '') || !['month', 'year', 'once', 'hour', 'million_tokens', 'credit_pack'].includes(p.period)) err(id, `price ${JSON.stringify(p).slice(0, 60)} needs plan, amount, a 3-letter currency and a known period`);
    if (!p.source_url || !VOCAB.source_type.includes(p.source_type) || !ISO_TS.test(p.observed_at || '')) err(id, 'each price needs source_url, source_type and observed_at');
  }
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
    on_device: r.on_device === true,
    online: r.online?.length || 0, online_free: !!r.online?.some((p) => p.free), online_no_card: !!r.online?.some((p) => p.no_card),
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

// ---- Originals and relations: link to the listing when it's in the catalog, else to Hugging Face ----
{
  const { listingPath } = await import('../render.js');
  const byHf = new Map(); const byId = new Map();
  for (const r of published) { byId.set(r.id, r); for (const d of r.distributions || []) if (d.source === 'huggingface') byHf.set(String(d.native_id).toLowerCase(), r); }
  const link = (hf) => { const r = byHf.get(String(hf).toLowerCase()); return r ? { listing: listingPath(r), name: r.name } : { url: `https://huggingface.co/${hf}` }; };
  let n = 0;
  for (const r of published) {
    if (r.type !== 'model') continue;
    for (const x of r.relations || []) {
      const t = String(x.target || '');
      if (x.target_hf && !x.target) Object.assign(x, link(x.target_hf), { target: `https://huggingface.co/${x.target_hf}` });
      else if (t.startsWith('cf:') && byId.has(t)) Object.assign(x, { listing: listingPath(byId.get(t)), name: byId.get(t).name });
      else if (t.startsWith('https://huggingface.co/')) Object.assign(x, link(t.replace('https://huggingface.co/', '')));
    }
    if (r.origin) { for (const o of r.origin.originals || []) Object.assign(o, link(o.hf_id)); n++; }
  }
  console.log(`Originals: ${n} models with a traced original`);
}

// ---- YouTube videos that name a listing (from tools/discover.mjs: official channels first, then keyword search) ----
{
  const D = existsSync(join(importDir, 'discover.json')) ? JSON.parse(readFileSync(join(importDir, 'discover.json'), 'utf8')) : {};
  const vids = [...(D.youtube?.videos || []).map((v) => ({ ...v, official: true })), ...(D.youtube?.search || []).map((v) => ({ ...v, official: false }))];
  if (vids.length) {
    const { shortName } = await import('./x.mjs');
    const norm = (t) => ' ' + String(t || '').toLowerCase().replace(/[^\p{L}\p{N}.]+/gu, ' ') + ' ';
    const titles = vids.map((v) => [v, norm(v.title)]);
    let n = 0;
    for (const r of published) {
      if (r.type === 'dataset') continue;
      const names = [r.name.replace(/\s*\(.*?\)\s*/g, ' ').trim(), shortName(r)].filter((x) => x && x.length >= 5 && /\d|\s/.test(x)).map(norm);
      if (r.type !== 'model') names.push(norm(r.name)); // apps and hosts: their brand name (multi-word or distinctive)
      const keys = [...new Set(names)].filter((k) => k.trim().length >= 4);
      if (!keys.length) continue;
      const hit = titles.filter(([, t]) => keys.some((k) => t.includes(k))).map(([v]) => ({ title: v.title, url: v.url, channel: v.channel, published_at: v.published_at, official: v.official }));
      if (hit.length) { r.yt_videos = hit.sort((a, b) => (b.official - a.official) || String(b.published_at).localeCompare(String(a.published_at))).slice(0, 3); n++; }
    }
    console.log(`YouTube: videos naming ${n} listings`);
  }
  // Reviews found by searching "<name> review" (tools/discover.mjs youtubeReviews).
  const rev = D.youtube?.reviews || {}; let nr = 0;
  for (const r of published) { const x = rev[r.id]; if (x) { r.yt_reviews = { checked_at: x.checked_at, videos: x.videos || [] }; if (x.videos?.length) nr++; } }
  if (Object.keys(rev).length) console.log(`YouTube reviews: ${nr} listings with videos (${Object.keys(rev).length} checked)`);
}

// ---- use it online: API providers serving each model (tools/providers.mjs) ----
const PROV = existsSync(join(importDir, 'providers.json')) ? JSON.parse(readFileSync(join(importDir, 'providers.json'), 'utf8')) : null;
if (PROV) {
  const hostById = new Map(published.filter((r) => r.type === 'host').map((r) => [r.id, r]));
  let n = 0;
  for (const r of published) {
    if (r.type !== 'model') continue;
    const hf = (r.distributions || []).find((d) => d.source === 'huggingface')?.native_id?.toLowerCase();
    if (!hf) continue;
    const list = [...(PROV.openrouter?.[hf] || []), ...(PROV.huggingface?.[hf] || [])];
    if (!list.length) continue;
    const seen = new Set(); const online = [];
    for (const p of list) {
      const key = `${p.provider}:${p.free ? 'free' : 'paid'}`; if (seen.has(key)) continue; seen.add(key);
      const host = p.host_id && hostById.get(p.host_id);
      const pm = host?.access?.payment_methods?.value;
      online.push({ provider: p.provider, name: p.name, url: p.url, host_id: host ? p.host_id : null,
        input: p.input == null ? null : +(+p.input).toFixed(3), output: p.output == null ? null : +(+p.output).toFixed(3), free: !!p.free,
        no_card: Array.isArray(pm) ? pm.some((m) => !CARD_METHODS.has(m.method)) : null,
        source_url: PROV.sources?.[p.via]?.url, observed_at: PROV.sources?.[p.via]?.observed_at });
    }
    // Free first, then cheapest output price, unknown prices last.
    online.sort((a, b) => (b.free - a.free) || ((a.output ?? 1e9) - (b.output ?? 1e9)));
    r.online = online; n++;
  }
  console.log(`Use it online: ${n} models served by API providers`);
}
// Replicate (tools/discover.mjs): its own listings, and listings of the same model (same name, related owner).
// Price per run varies by hardware and isn't read, so it shows as unknown.
{
  const D = existsSync(join(importDir, 'discover.json')) ? JSON.parse(readFileSync(join(importDir, 'discover.json'), 'utf8')) : {};
  const { replicateMatch } = await import('./import.mjs');
  const rep = D.replicate?.models || [];
  let n = 0;
  const add = (r, id, url) => {
    if ((r.online ||= []).some((p) => p.provider === 'replicate')) return;
    r.online.push({ provider: 'replicate', name: 'Replicate', url, host_id: null, input: null, output: null, free: false, no_card: null, source_url: `https://api.replicate.com/v1/models/${id}`, observed_at: D.replicate?.checked_at || null });
    n++;
  };
  for (const r of published) {
    if (r.type !== 'model') continue;
    const own = (r.distributions || []).find((d) => d.source === 'replicate');
    if (own) { add(r, own.native_id, own.url); continue; }
  }
  const models = published.filter((r) => r.type === 'model');
  for (const m of rep) { const r = replicateMatch(m, models); if (r) add(r, m.id, m.url); }
  if (rep.length || n) console.log(`Replicate: ${rep.length} new models found, shown on ${n} listings`);
}

// ---- App Store check (tools/appstore.mjs) and store links (data/app-stores.json) ----
const APPSTORE = existsSync(join(importDir, 'appstore.json')) ? JSON.parse(readFileSync(join(importDir, 'appstore.json'), 'utf8')) : null;
const STORE_IDS = existsSync(join(root, 'data', 'app-stores.json')) ? JSON.parse(readFileSync(join(root, 'data', 'app-stores.json'), 'utf8')) : {};
let storeConfirmed = 0;
for (const r of published) {
  if (r.type !== 'app') continue;
  const urls = new Set(r.app_store_urls || []);
  const e = APPSTORE?.apps?.[r.id];
  if (e?.apple?.confirmed) {
    storeConfirmed++;
    // A confirmed id replaces any unconfirmed Apple link.
    for (const u of [...urls]) if (/apps\.apple\.com/.test(u)) urls.delete(u);
    urls.add(e.apple.url);
    r.official_store = { seller: e.apple.seller, url: e.apple.url, rating: e.apple.rating, ratings: e.apple.ratings, checked_at: e.apple.checked_at };
    const cs = Object.entries(e.countries || {});
    if (cs.length && r.access) r.access.app_store_countries = { value: cs.filter(([, v]) => v).map(([c]) => c).sort(), checked: cs.length,
      source_url: `https://itunes.apple.com/lookup?id=${e.apple.id}`, source_type: 'official', observed_at: e.countries_checked_at };
    if (e.lookalikes?.v === 2) r.lookalikes = e.lookalikes;
    if (e.apple.languages?.length && (!Array.isArray(r.interface_languages?.value))) r.interface_languages = { value: e.apple.languages, source_url: `https://itunes.apple.com/lookup?id=${e.apple.id}`, source_type: 'official', observed_at: e.apple.checked_at, note: 'App Store listing languages' }; // older counts didn't require an AI-sounding name
  }
  const gp = STORE_IDS[r.id]?.google_play;
  if (gp && ![...urls].some((u) => /play\.google\.com/.test(u))) urls.add(gp);
  if (urls.size) r.app_store_urls = [...urls];
}
if (APPSTORE) console.log(`App Store: ${storeConfirmed} apps with a confirmed official listing`);

// ---- possibly discontinued: a confirmed App Store app missing twice, or a homepage that's gone ----
{
  const RC = existsSync(join(importDir, 'recheck.json')) ? JSON.parse(readFileSync(join(importDir, 'recheck.json'), 'utf8')) : null;
  let n = 0;
  for (const r of published) {
    if (r.type !== 'app' && r.type !== 'host') continue;
    const e = APPSTORE?.apps?.[r.id]?.apple;
    const home = r.url && RC?.urls?.[r.url];
    let reason = null;
    if (e?.ever_confirmed && e.missing >= 2) reason = `no longer found in the App Store (checked ${e.checked_at.slice(0, 10)})`;
    else if (home && home.fails >= 2 && [404, 410].includes(home.status)) reason = `its homepage answers "page not found" (since ${String(home.ok_at || home.checked_at).slice(0, 10)})`;
    if (reason) { r.possibly_discontinued = { reason }; n++; }
  }
  if (n) console.log(`Possibly discontinued: ${n} listings`);
}

// ---- re-check of access source pages (tools/recheck.mjs) and the age of access facts ----
const { accessCheck } = await import('./recheck.mjs');
const RECHECK = existsSync(join(importDir, 'recheck.json')) ? JSON.parse(readFileSync(join(importDir, 'recheck.json'), 'utf8')) : null;
const ACCESS_STALE_DAYS = 180;
let recheckChanged = 0; let autoVerified = 0;
for (const r of published) {
  const accs = r.access ? [r.access] : (r.distributions || []).map((d) => d.access).filter(Boolean);
  if (!accs.length) continue;
  const dates = accs.flatMap((a) => Object.values(a)).filter((c) => c && typeof c === 'object' && c.source_url && c.observed_at).map((c) => c.observed_at).sort();
  const chk = accessCheck(r, RECHECK) || {};
  if (dates.length) chk.facts_checked_at = dates[0];
  if (dates.length && (Date.now() - new Date(dates[0])) / 86400000 > ACCESS_STALE_DAYS) chk.stale = true;
  if (chk.changed?.length) recheckChanged++;
  // The automatic page check only reports what it found; "verified" stays a human check (decision 66).
  if (chk.facts?.length && chk.facts.every((f) => f.status === 'confirmed')) autoVerified++;
  if (Object.keys(chk).length) r.access_check = chk;
}
if (RECHECK) console.log(`Access re-check: ${recheckChanged} listings have source pages that changed after their facts were checked; ${autoVerified} with every checked fact found on its page`);

for (const r of published) { r.answers = answers(r); const hw = hardware(r); if (hw) r.hardware = hw; }

const counts = Object.fromEntries(VOCAB.type.map((t) => [t, published.filter((r) => r.type === t).length]));
console.log(`OK: ${published.length} records (${counts.model} models, ${counts.dataset} datasets, ${counts.app} apps, ${counts.host} hosts)`);
if (!checkOnly) {
  const generated_at = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  // The page loads meta.json first, then only the listing type the visitor opens (page weight).
  // catalog.json holds everything, for anyone who wants the whole data set.
  const langCount = {};
  for (const r of published.filter((x) => x.type === 'model' || x.type === 'app')) for (const l of [...(Array.isArray(r.languages?.value) ? r.languages.value : []), ...(Array.isArray(r.interface_languages?.value) ? r.interface_languages.value : [])]) if (/^[a-z]{2}$/.test(l)) langCount[l] = (langCount[l] || 0) + 1;
  const languages = Object.entries(langCount).filter(([l, n]) => n >= 3 || ['sw', 'yo', 'ha', 'am', 'zu', 'ig', 'so', 'rw'].includes(l)).map(([l]) => l).sort();
  const storePayments = existsSync(join(root, 'data', 'store-payments.json')) ? JSON.parse(readFileSync(join(root, 'data', 'store-payments.json'), 'utf8')) : null;
  // When each source last refreshed successfully, and how old is too old (hours).
  const readJ = (f) => { try { return JSON.parse(readFileSync(join(importDir, f), 'utf8')); } catch { return null; } };
  const imp = readJ('import-state.json') || {}; const xs = readJ('x-state.json') || {}; const pv = readJ('providers.json'); const ap = readJ('appstore.json'); const rc = readJ('recheck.json'); const bm = readJ('benchmarks.json');
  const freshness = [
    ['Hugging Face models', imp.huggingface_models, 48], ['Hugging Face datasets', imp.huggingface_datasets, 48], ['Ollama', imp.ollama, 48],
    ['X', xs.last_scan ? xs.last_scan.replace(/\.\d+Z$/, 'Z') : null, 24], ['API providers', pv?.sources?.huggingface?.observed_at, 48],
    ['Benchmarks', bm?.observed_at, 72], ['App Store check', ap?.checked_at, 72], ['Access page re-check', rc?.checked_at, 48],
  ].map(([label, at, max_hours]) => ({ label, at: at || null, max_hours }));
  writeFileSync(join(root, 'data', 'meta.json'), JSON.stringify({ schema_version: 1, generated_at, license: 'CC-BY-4.0', counts, countries, languages, freshness, store_payments: storePayments ? { google_play: storePayments.google_play } : null, runtimes: runtimeDocs, benchmark_sources: BENCH.sources || {} }));
  // List files carry only what the list needs (cards, filters, search, sorting). Opening a card
  // fetches the listing's full record from its page folder (l/.../record.json).
  for (const t of VOCAB.type) writeFileSync(join(root, 'data', `${t}s.json`), JSON.stringify(published.filter((r) => r.type === t).map(slim)));
  writeFileSync(outFile, JSON.stringify({ schema_version: 1, generated_at, license: 'CC-BY-4.0', countries, records: published, grouped: CURATED.folded, hidden: CURATED.hidden }));
  console.log(`Wrote data/meta.json, data/{models,datasets,apps,hosts}.json and ${outFile.replace(root + '/', '')}`);
  await addSimilar(published);
  writeListingPages(published, countries).then(() => writeMovedPages()).then(() => writeNewPages(published)).then(() => writeGuides(published));
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

// ---- "Similar": up to 4 listings of the same type that share what it's good for (a next step after viewing one) ----
// Same tasks or kinds first, then checked listings and popularity; near-duplicates of the same family, listings with
// warnings and uncensored models (unless this one is) are left out. Shown in the full record and on listing pages.
async function addSimilar(records) {
  const { popularity, listingPath, CAPS } = await import('../render.js');
  const traits = (r) => r.type === 'host' ? (r.kinds || []) : r.type === 'dataset' ? (r.tasks || []) : (r.answers?.good_for || []);
  const fam = (r) => (r.family || r.name).toLowerCase().replace(/[-_\s.]+/g, ' ').split(' ').slice(0, 2).join(' ');
  const byType = {};
  for (const r of records) if (r.warning === 'none' || !r.warning) (byType[r.type] ||= []).push(r);
  let n = 0;
  for (const r of records) {
    const mine = traits(r); if (!mine.length) continue;
    const cands = [];
    for (const o of byType[r.type] || []) {
      if (o === r || fam(o) === fam(r) || (o.answers?.uncensored && !r.answers?.uncensored)) continue;
      const shared = traits(o).filter((t) => mine.includes(t)); if (!shared.length) continue;
      cands.push([shared.length * 3 + (traits(o)[0] === mine[0] ? 2 : 0) + (o.verification_status === 'verified' ? 1 : 0) + Math.log10(1 + popularity(o)) / 2, o, shared]);
    }
    cands.sort((a, b) => b[0] - a[0]);
    r.similar = cands.slice(0, 4).map(([, o, shared]) => ({ name: o.name, path: listingPath(o), publisher: o.publisher_name || o.publisher, shared: shared.slice(0, 2).map((t) => (CAPS[t] || t).replace(/^\S+\s/, '').replace(/-/g, ' ')) }));
    if (r.similar.length) n++;
  }
  console.log(`Similar: ${n} listings with suggestions`);
}

// ---- a static page for every listing (shareable, previewable, findable) ----
async function writeListingPages(records, countryList) {
  const R = await import('../render.js');
  R.setCountries(countryList);
  R.view.runtimes = runtimeDocs;
  R.view.site = SITE;
  R.view.storePayments = existsSync(join(root, 'data', 'store-payments.json')) ? JSON.parse(readFileSync(join(root, 'data', 'store-payments.json'), 'utf8')) : null;
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
<script>try { var l = localStorage.getItem('look'); if (l === 'light' || l === 'dim') document.documentElement.dataset.theme = l; } catch (e) {}</script>
</head>
<body>
<header class="top">
  <div class="wrap top-row"><a class="brand" href="${base}"><img src="${base}img/fox-logo.webp?v=${build}" alt="" width="40" height="40">CleverFox</a></div>
  <div class="wrap"><p class="tagline"><a href="${base}#${r.type}">← All ${R.esc({ model: 'models', dataset: 'datasets', app: 'apps', host: 'hosting providers' }[r.type])}</a></p></div>
</header>
<main class="wrap listing">
  <div class="listing-grid">
  <article class="card card-page" id="listing">
    ${R.listingInner(r)}
  </article>
  <div class="side-col">${R.xPanel(r)}${R.ytPanel(r)}</div>
  </div>
</main>
<footer class="wrap foot">
  <p>Every fact links to its source and the date it was checked; "unknown" means we couldn't confirm it. Catalog data under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>${r.independent_benchmarks?.length ? ` · Benchmarks: ${[...new Set(r.independent_benchmarks.map((x) => x.source))].map((s) => s === 'Epoch AI' ? '<a href="https://epoch.ai/benchmarks">Epoch AI</a> (CC BY 4.0)' : '<a href="https://artificialanalysis.ai/">Artificial Analysis</a>').join(', ')}` : ''} · <a href="${base}">CleverFox</a></p>
</footer>
<script type="module">
import { wireShare, view, setCountries, listingInner } from '${base}render.js?v=${build}';
import { wireListingPage } from '${base}you.js?v=${build}';
const brief = ${JSON.stringify({ id: r.id, name: r.name, type: r.type, publisher: r.publisher_name || r.publisher }).replace(/</g, '\\u003c')};
wireShare(document); wireListingPage(brief, '${path}');
// Redraw for this visitor's device, country and language (kept in this browser), and when they pick a country here.
const get = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const box = document.getElementById('listing');
let full = null;
async function paint() {
  if (!full) {
    const meta = await fetch('${base}data/meta.json').then((x) => x.json()).catch(() => null);
    if (meta) { setCountries(meta.countries || []); view.runtimes = meta.runtimes || {}; view.storePayments = meta.store_payments || null; }
    full = await fetch('record.json').then((x) => x.json()).catch(() => null);
    if (!full) return;
  }
  Object.assign(view, { base: '${base}', site: '${SITE}', country: get('country'), mem: +get('mem') || 0, ulang: get('ulang') });
  box.innerHTML = listingInner(full);
  if (navigator.share) box.querySelectorAll('[data-act="share"]').forEach((b) => { b.hidden = false; });
  wireListingPage(brief, '${path}');
}
if (get('country') || get('mem') || get('ulang')) paint();
box.addEventListener('change', (e) => { if (!e.target.matches('.use-country')) return; try { localStorage.setItem('country', e.target.value); } catch {} paint(); });
</script>
${r.x_buzz?.posts ? `<script>document.getElementById('x-load')?.addEventListener('click', function () { this.disabled = true; this.textContent = 'Loading posts from X…'; var s = document.createElement('script'); s.async = true; s.src = 'https://platform.twitter.com/widgets.js'; document.body.appendChild(s); });</script>` : ''}
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

// ---- new this week: a page and an RSS feed ----
// Listings first seen in the last 7 days. The catalog's first day (the initial import) doesn't count as new.
async function writeNewPages(records) {
  const R = await import('../render.js');
  const esc = R.esc;
  const days = records.map((r) => (r.first_seen_at || '').slice(0, 10)).filter(Boolean).sort();
  const start = days[0];
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  const fresh = records.filter((r) => r.first_seen_at && r.first_seen_at.slice(0, 10) !== start)
    .sort((a, b) => b.first_seen_at.localeCompare(a.first_seen_at) || R.popularity(b) - R.popularity(a));
  const week = fresh.filter((r) => r.first_seen_at >= cutoff);
  const WORD = { model: 'Models', dataset: 'Datasets', app: 'Apps', host: 'Hosting and APIs' };
  const groups = Object.keys(WORD).map((t) => [t, week.filter((r) => r.type === t)]).filter(([, l]) => l.length);
  // App and hosting launches spotted on X: listed until researched (their access facts can't be read from a post).
  const listedSites = new Set(records.flatMap((r) => [r.url, ...(r.official_urls || [])]).filter(Boolean).map((u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } }));
  const spotted = (XDATA.announcements || []).filter((a) => a.kind === 'launch' && a.created_at >= cutoff && !a.links.sites.some((h) => listedSites.has(h)))
    .sort((a, b) => b.likes - a.likes).slice(0, 40);
  const li = (r) => `<li><a href="../${R.listingPath(r)}"><strong>${esc(r.name)}</strong></a> <span class="muted">${esc(r.publisher_name || r.publisher)} · ${esc(R.fmtDate(r.first_seen_at))}${r.discovered_via?.source === 'x' ? ' · 🆕 spotted on X' : r.discovered_via?.source === 'replicate' ? ' · 🆕 new on Replicate' : ''}</span><br>${esc(r.description)}</li>`;
  const build = (process.env.GITHUB_SHA || 'dev').slice(0, 7);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>New this week · CleverFox</title><meta name="description" content="AI models, datasets, apps and hosting added to CleverFox in the last 7 days.">
<link rel="canonical" href="${SITE}new/"><link rel="alternate" type="application/rss+xml" title="CleverFox: new listings" href="${SITE}feed.xml">
<link rel="icon" type="image/png" sizes="32x32" href="../img/favicon-32.png?v=${build}"><link rel="stylesheet" href="../style.css?v=${build}">
<script>try { var l = localStorage.getItem('look'); if (l === 'light' || l === 'dim') document.documentElement.dataset.theme = l; } catch (e) {}</script>
</head><body>
<header class="top"><div class="wrap top-row"><a class="brand" href="../"><img src="../img/fox-logo.webp?v=${build}" alt="" width="40" height="40">CleverFox</a></div><div class="wrap"><p><a href="../">← All listings</a> · <a href="../feed.xml">RSS feed</a></p></div></header>
<main class="wrap listing"><h1>🆕 New this week</h1>
<p class="muted">${week.length} listings added in the last 7 days.</p>
${groups.map(([t, l]) => `<h2>${WORD[t]} (${l.length})</h2><ul class="new-list">${l.slice(0, 100).map(li).join('')}</ul>${l.length > 100 ? `<p class="muted">+${l.length - 100} more</p>` : ''}`).join('') || '<p>Nothing new in the last 7 days.</p>'}
${ghSections(R)}
${spotted.length ? `<h2>📣 Spotted on X: app and hosting launches (${spotted.length})</h2><p class="muted">Launch posts with real engagement, not yet researched. They're listed once their access facts (free plan, payment, countries) are checked at the official site.</p><ul class="new-list">${spotted.map((a) => `<li><strong>${esc(a.links.sites[0])}</strong> <span class="muted">· @${esc(a.author)} · ❤️ ${a.likes} · ${esc(R.fmtDate(a.created_at))}</span> · <a href="${esc(a.url)}" rel="noopener">the post ↗</a></li>`).join('')}</ul>` : ''}
</main>
${GOATCOUNTER}
</body></html>
`;
  mkdirSync(join(root, 'new'), { recursive: true });
  writeFileSync(join(root, 'new', 'index.html'), html);
  const xml = (t) => String(t ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
  const items = fresh.slice(0, 50).map((r) => `<item><title>${xml(`${r.name} (${r.type})`)}</title><link>${SITE}${R.listingPath(r)}</link><guid isPermaLink="true">${SITE}${R.listingPath(r)}</guid><pubDate>${new Date(r.first_seen_at).toUTCString()}</pubDate><description>${xml(r.description)}</description></item>`);
  writeFileSync(join(root, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>CleverFox: new listings</title><link>${SITE}</link><description>New AI models, datasets, apps and hosting on CleverFox.</description><language>en</language>\n${items.join('\n')}\n</channel></rss>\n`);
  // One feed per task ("what's new for coding"), for people who follow one need. Not one per filter combination.
  mkdirSync(join(root, 'feeds'), { recursive: true });
  for (const [cap, label] of Object.entries(R.CAPS)) {
    const its = fresh.filter((r) => (r.answers?.good_for || []).includes(cap)).slice(0, 30).map((r) => `<item><title>${xml(`${r.name} (${r.type})`)}</title><link>${SITE}${R.listingPath(r)}</link><guid isPermaLink="true">${SITE}${R.listingPath(r)}</guid><pubDate>${new Date(r.first_seen_at).toUTCString()}</pubDate><description>${xml(r.description)}</description></item>`);
    const name = label.replace(/^\S+\s/, '');
    writeFileSync(join(root, 'feeds', `${cap}.xml`), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>CleverFox: new for ${xml(name.toLowerCase())}</title><link>${SITE}</link><description>New AI models and apps on CleverFox that are good for ${xml(name.toLowerCase())}.</description><language>en</language>\n${its.join('\n')}\n</channel></rss>\n`);
  }
  console.log(`New this week: ${week.length} listings; feed has ${items.length}; ${spotted.length} app or hosting launches spotted on X`);
}

// ---- guide pages: a small, hand-picked set of questions people search for (spec phase 2 guides) ----
// Each is built from stated facts in the catalog, refreshed with every build. Not a page per filter combination.
async function writeGuides(records) {
  const R = await import('../render.js');
  R.view.country = ''; R.view.mem = 0; R.view.ulang = ''; R.view.base = '../../';
  const esc = R.esc;
  // Apps and hosts in guides only once their official page was read (verified); candidates stay on their own pages.
  const by = (t) => records.filter((r) => r.type === t && r.warning === 'none' && !r.possibly_discontinued && (t === 'model' || t === 'dataset' || r.verification_status === 'verified'));
  const models = by('model'); const apps = by('app'); const hosts = by('host');
  const eci = (r) => { const b = (r.independent_benchmarks || []).find((x) => x.id === 'epoch_eci' || x.id === 'aa_intelligence'); return b ? parseFloat(b.display) || 0 : 0; };
  const rating = (r) => (r.official_store?.rating || 0) * Math.log10(10 + (r.official_store?.ratings || 0));
  const speaks = (r, l) => (Array.isArray((r.type === 'app' ? r.interface_languages : r.languages)?.value) && (r.type === 'app' ? r.interface_languages : r.languages).value.includes(l));
  const nonCard = (r) => R.methodsOf(r.access).filter((m) => !R.CARDS.includes(m.method)).map((m) => R.METHOD_LABELS[m.method] + (m.note ? ` (${m.note})` : ''));
  const localFits = (gb) => models.filter((r) => r.local_ready && r.hardware && r.hardware.min_memory_gb <= gb * 0.8 && !r.answers?.uncensored && (r.answers?.good_for || []).some((c) => ['chat', 'writing', 'coding'].includes(c)))
    .sort((a, b) => eci(b) - eci(a) || R.popularity(b) - R.popularity(a));
  const AFRICAN = ['sw', 'yo', 'ha', 'am', 'zu', 'ig', 'so', 'rw'];
  const REGIONS = { 'Africa': ['ZA', 'NG', 'KE', 'EG', 'MA', 'GH', 'TZ', 'ET', 'RW', 'SN', 'CI', 'TN', 'DZ'], 'Middle East and Turkey': ['AE', 'SA', 'QA', 'IL', 'TR', 'BH', 'KW', 'OM', 'JO'], 'South Asia': ['IN', 'PK', 'BD', 'LK', 'NP'], 'Southeast Asia': ['SG', 'ID', 'MY', 'TH', 'VN', 'PH'], 'Latin America': ['BR', 'MX', 'CL', 'CO', 'AR', 'PE'] };
  const play = R.view.storePayments?.google_play;
  const guides = [
    { slug: 'pay-without-a-card', title: 'AI you can pay for without a card', intro: 'Apps, API providers and hosting that officially accept a way to pay other than a Visa or Mastercard: mobile money, UPI, Pix, PayPal, bank transfer, crypto, app-store billing and more. Plus: many apps can be paid through Google Play, which takes other methods in 66 countries.',
      items: [...apps, ...hosts].filter((r) => nonCard(r).length).sort((a, b) => nonCard(b).length - nonCard(a).length).map((r) => [r, `Pay with: ${nonCard(r).slice(0, 4).join(', ')}`]) },
    { slug: 'pay-with-mobile-money', title: 'AI you can pay for with mobile money', intro: 'Listings that officially accept mobile money, and the countries where Google Play takes mobile money or your phone bill for apps sold in Android apps.',
      items: [...apps, ...hosts].filter((r) => R.methodsOf(r.access).some((m) => m.method === 'mobile_money')).map((r) => [r, `Mobile money: ${R.methodsOf(r.access).filter((m) => m.method === 'mobile_money').map((m) => m.note || 'yes').join(', ')}`]),
      extra: play ? `<h2>Through Google Play</h2><ul class="new-list">${Object.entries(play.countries).filter(([, l]) => l.some(([m]) => m === 'mobile_money' || m === 'carrier_billing')).map(([c, l]) => `<li><strong>${esc(R.countryName(c))}</strong>: ${esc(l.filter(([m]) => m === 'mobile_money' || m === 'carrier_billing').map(([m, n]) => n || R.METHOD_LABELS[m]).join(', '))}</li>`).join('')}</ul><p class="muted">Source: <a href="${esc(play.source_url)}">Google Play Help</a>. Apps sold through Google Play: ${apps.filter(R.soldOnPlay).map((r) => `<a href="../../${R.listingPath(r)}">${esc(r.name)}</a>`).join(', ')}.</p>` : '' },
    { slug: 'free-ai-apps', title: 'Free AI apps', intro: 'AI apps you can use for free, completely or on a free plan, most-rated first.',
      items: apps.filter((r) => ['free', 'free_tier'].includes(r.access?.free?.value)).sort((a, b) => rating(b) - rating(a)).map((r) => [r, R.FREE_LABELS[r.access.free.value] + (r.access.free_limits ? `: ${r.access.free_limits}` : '')]) },
    { slug: 'ai-for-an-8gb-laptop', title: 'AI that runs on an 8 GB laptop', intro: 'Models for chat, writing or coding that fit in 8 GB of memory and run offline, for free. Strongest independent score first, then most downloaded.',
      items: localFits(8).map((r) => [r, `Needs ~${r.hardware.min_memory_gb} GB${eci(r) ? ` · independent score ${eci(r)}` : ''}`]) },
    { slug: 'ai-for-a-16gb-laptop', title: 'AI that runs on a 16 GB laptop or Mac', intro: 'Models for chat, writing or coding that fit in 16 GB of memory and run offline, for free.',
      items: localFits(16).map((r) => [r, `Needs ~${r.hardware.min_memory_gb} GB${eci(r) ? ` · independent score ${eci(r)}` : ''}`]) },
    { slug: 'offline-ai-on-your-phone', title: 'AI that runs offline on your phone', intro: 'Apps that run AI models on the phone itself: private, free to use after the download, and working without internet.',
      items: apps.filter((r) => r.on_device).map((r) => [r, R.FREE_LABELS[r.access?.free?.value] || 'Price unknown']) },
    { slug: 'ai-in-african-languages', title: 'AI in African languages', intro: 'Models and apps that handle Swahili, Yoruba, Hausa, Amharic, Zulu, Igbo, Somali or Kinyarwanda, as their pages state.',
      items: [...apps, ...models].filter((r) => AFRICAN.some((l) => speaks(r, l))).sort((a, b) => (b.type === 'app') - (a.type === 'app') || R.popularity(b) - R.popularity(a)).map((r) => [r, AFRICAN.filter((l) => speaks(r, l)).map(R.langName).join(', ')]) },
    { slug: 'ai-in-arabic', title: 'AI in Arabic', intro: 'Apps and models that handle Arabic, as their pages state.',
      items: [...apps, ...models].filter((r) => speaks(r, 'ar')).sort((a, b) => (b.type === 'app') - (a.type === 'app') || R.popularity(b) - R.popularity(a)).map((r) => [r, r.type === 'app' ? 'App' : r.local_ready ? 'Model, runs locally' : 'Model']) },
    { slug: 'free-ai-models-online', title: 'Use strong AI models online for free', intro: 'Models you can use for free through an API provider: no GPU and no payment needed, within the provider\'s limits.',
      items: models.filter((r) => r.online?.some((p) => p.free)).sort((a, b) => eci(b) - eci(a) || R.popularity(b) - R.popularity(a)).map((r) => [r, `Free on ${r.online.filter((p) => p.free).map((p) => p.name).join(', ')}`]) },
    { slug: 'gpu-hosting-near-you', title: 'GPU hosting near you', intro: 'Providers that rent GPUs from data centers in Africa, the Middle East, South and Southeast Asia and Latin America.',
      items: hosts.filter((r) => Array.isArray(r.data_centers?.value)).flatMap((r) => { const cs = r.data_centers.value.map((d) => d.country); const regs = Object.entries(REGIONS).filter(([, l]) => cs.some((c) => l.includes(c))).map(([n]) => n); return regs.length ? [[r, `${regs.join(', ')}: ${[...new Set(cs.filter((c) => Object.values(REGIONS).flat().includes(c)))].map(R.countryName).join(', ')}`]] : []; }) },
  ];
  const build = (process.env.GITHUB_SHA || 'dev').slice(0, 7);
  const page = (title, desc, canonical, body, depth) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · CleverFox</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE}img/og.jpg">
<link rel="icon" type="image/png" sizes="32x32" href="${'../'.repeat(depth)}img/favicon-32.png?v=${build}"><link rel="stylesheet" href="${'../'.repeat(depth)}style.css?v=${build}">
<script>try { var l = localStorage.getItem('look'); if (l === 'light' || l === 'dim') document.documentElement.dataset.theme = l; } catch (e) {}</script>
</head><body>
<header class="top"><div class="wrap top-row"><a class="brand" href="${'../'.repeat(depth)}"><img src="${'../'.repeat(depth)}img/fox-logo.webp?v=${build}" alt="" width="40" height="40">CleverFox</a></div><div class="wrap"><p><a href="${'../'.repeat(depth)}">← All listings</a> · <a href="${'../'.repeat(depth)}guides/">📚 All guides</a> · <a href="${'../'.repeat(depth)}glossary/">📖 Glossary</a></p></div></header>
<main class="wrap listing">${body}</main>
<footer class="wrap foot"><p>Built from the CleverFox catalog on ${esc(R.fmtDate(new Date().toISOString()))}. Every fact links to its source on the listing's page. Payment and country facts change often, so check the official page before paying.</p></footer>
${GOATCOUNTER}
</body></html>
`;
  const urls = [];
  for (const g of guides) {
    const items = g.items.slice(0, 30);
    const body = `<h1>${esc(g.title)}</h1><p>${esc(g.intro)}</p><p class="muted">${g.items.length} listing${g.items.length === 1 ? '' : 's'}${g.items.length > 30 ? ', top 30 shown' : ''}.</p>
<ol class="guide-list">${items.map(([r, why]) => `<li><a href="../../${R.listingPath(r)}"><strong>${esc(r.name)}</strong></a> <span class="muted">${esc(r.publisher_name || r.publisher)}</span><br>${esc(r.description)}<br><span class="chip">${esc(why)}</span></li>`).join('')}</ol>${g.extra || ''}`;
    mkdirSync(join(root, 'guides', g.slug), { recursive: true });
    writeFileSync(join(root, 'guides', g.slug, 'index.html'), page(g.title, g.intro, `${SITE}guides/${g.slug}/`, body, 2));
    urls.push(`${SITE}guides/${g.slug}/`);
  }
  writeFileSync(join(root, 'guides', 'index.html'), page('Guides', 'Answers to common questions about using AI from anywhere: paying without a card, running AI on your laptop or phone, AI in your language, hosting near you.', `${SITE}guides/`,
    `<h1>📚 Guides</h1><p>Answers to common questions, built from the catalog and refreshed every day.</p><ul class="new-list">${guides.map((g) => `<li><a href="${g.slug}/"><strong>${esc(g.title)}</strong></a> <span class="muted">(${g.items.length})</span><br>${esc(g.intro)}</li>`).join('')}</ul>`, 1));
  urls.push(`${SITE}guides/`);
  // Add the guides to the sitemap.
  const sm = join(root, 'sitemap.xml');
  if (existsSync(sm)) writeFileSync(sm, readFileSync(sm, 'utf8').replace('</urlset>', urls.map((u) => `<url><loc>${esc(u)}</loc></url>`).join('\n') + '\n</urlset>'));
  console.log(`Guides: ${guides.map((g) => `${g.slug} (${g.items.length})`).join(', ')}`);
}

// "New this week": GitHub new projects and watchlist releases (tools/discover.mjs), kept apart on purpose.
function ghSections(R) {
  const d = existsSync(join(importDir, 'discover.json')) ? JSON.parse(readFileSync(join(importDir, 'discover.json'), 'utf8')) : {};
  const esc = R.esc; const week = Date.now() - 7 * 86400000;
  const rel = (d.github?.releases || []).filter((r) => new Date(r.published_at) >= week);
  const repos = (d.github?.new_repos || []).filter((r) => new Date(r.first_seen) >= week).slice(0, 30);
  const ann = (d.llm_releases?.announcements || []).slice(0, 20);
  let h = '';
  if (rel.length) h += `<h2>📦 Releases (${rel.length})</h2><p class="muted">New versions of tools and projects CleverFox watches on GitHub.</p><ul class="new-list">${rel.map((r) => `<li><strong>${esc(r.repo)}</strong> ${esc(r.tag)} <span class="muted">· ${esc(R.fmtDate(r.published_at))}</span> · <a href="${esc(r.url)}" rel="noopener">release notes ↗</a></li>`).join('')}</ul>`;
  if (repos.length) h += `<h2>🧪 New projects on GitHub (${repos.length})</h2><p class="muted">Brand-new repositories matching AI searches (LLM, datasets, inference, agents), not reviewed: a new project isn't a usable release. Stars show interest, not quality.</p><ul class="new-list">${repos.map((r) => `<li><a href="${esc(r.url)}" rel="noopener"><strong>${esc(r.full_name)}</strong></a> <span class="muted">· ★ ${r.stars} · ${esc(r.query)} · created ${esc(R.fmtDate(r.created_at))}</span>${r.description ? `<br>${esc(r.description)}` : ''}</li>`).join('')}</ul>`;
  const vids = (d.youtube?.videos || []).filter((v) => new Date(v.published_at) >= week).slice(0, 30);
  const ytSearch = (d.youtube?.search || []).slice(0, 20);
  if (vids.length) h += `<h2>▶️ On YouTube: official channels (${vids.length})</h2><p class="muted">New videos from AI makers' official channels. Models and datasets they link on Hugging Face are added to the catalog.</p><ul class="new-list">${vids.map((v) => `<li><a href="${esc(v.url)}" rel="noopener"><strong>${esc(v.title)}</strong></a> <span class="muted">· ${esc(v.channel)} · ${esc(R.fmtDate(v.published_at))}</span></li>`).join('')}</ul>`;
  if (ytSearch.length) h += `<h2>🔎 Spotted on YouTube (not reviewed)</h2><p class="muted">Recent videos matching AI release searches. Anyone can post, so check the maker's own site.</p><ul class="new-list">${ytSearch.map((v) => `<li><a href="${esc(v.url)}" rel="noopener">${esc(v.title)}</a> <span class="muted">· ${esc(v.channel)}</span></li>`).join('')}</ul>`;
  if (ann.length) h += `<h2>📰 On llm-releases.com</h2><p class="muted">Release announcements linked from <a href="${esc(d.llm_releases.source_url)}" rel="noopener">llm-releases.com</a>, checked ${esc(R.fmtDate(d.llm_releases.checked_at))}. Models and datasets it links on Hugging Face are added to the catalog.</p><ul class="new-list">${ann.map((a) => { const generic = /^(open|read more|more|link|source|here|view|details|visit|go|→|↗)$/i.test(a.text.trim()); let label = a.text; if (generic || a.text.length < 4) { try { const u = new URL(a.url); label = (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '').slice(0, 90); } catch {} } return `<li><a href="${esc(a.url)}" rel="noopener">${esc(label)}</a></li>`; }).join('')}</ul>`;
  return h;
}
