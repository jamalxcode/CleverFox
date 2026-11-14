// Validates the hand-entered seed records and writes the catalog the page loads.
// Usage: node tools/build.mjs [--check]   (--check validates without writing)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
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
  ...(existsSync(importDir) ? readdirSync(importDir).filter((f) => f.endsWith('.json')).sort().map((f) => join(importDir, f)) : []),
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

const published = records.map((r) => {
  const { research_notes, ...rec } = r;
  const sources = new Set(rec.evidence_urls);
  collectSources(rec, sources);
  rec.evidence_urls = [...sources];
  if (rec.access) rec.access.no_card_needed = noCardNeeded(rec.access);
  for (const d of rec.distributions || []) if (d.access) d.access.no_card_needed = noCardNeeded(d.access);
  return rec;
});

const counts = Object.fromEntries(VOCAB.type.map((t) => [t, published.filter((r) => r.type === t).length]));
console.log(`OK: ${published.length} records (${counts.model} models, ${counts.dataset} datasets, ${counts.app} apps, ${counts.host} hosts)`);
if (!checkOnly) {
  const generated_at = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  // The page loads meta.json first, then only the listing type the visitor opens (page weight).
  // catalog.json holds everything, for anyone who wants the whole data set.
  writeFileSync(join(root, 'data', 'meta.json'), JSON.stringify({ schema_version: 1, generated_at, license: 'CC-BY-4.0', counts, countries }));
  for (const t of VOCAB.type) writeFileSync(join(root, 'data', `${t}s.json`), JSON.stringify(published.filter((r) => r.type === t)));
  writeFileSync(outFile, JSON.stringify({ schema_version: 1, generated_at, license: 'CC-BY-4.0', countries, records: published }));
  console.log(`Wrote data/meta.json, data/{models,datasets,apps,hosts}.json and ${outFile.replace(root + '/', '')}`);
}
