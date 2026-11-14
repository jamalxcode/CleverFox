// CleverFox: loads the catalog one listing type at a time and renders it with filters.
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

const METHOD_LABELS = {
  card_international: 'International card', card_local: 'Local card', paypal: 'PayPal', crypto: 'Crypto',
  mobile_money: 'Mobile money', upi: 'UPI', pix: 'Pix', alipay: 'Alipay', wechat_pay: 'WeChat Pay',
  bank_transfer: 'Bank transfer', app_store_billing: 'App store billing', prepaid_or_gift_card: 'Prepaid / gift card',
  carrier_billing: 'Phone bill', other: 'Other',
};
const FREE_LABELS = { free: 'Free', free_tier: 'Free tier', trial: 'Free trial', paid_only: 'Paid only' };
const KIND_LABELS = { gpu_cloud: 'GPU cloud', vm: 'Virtual machines', bare_metal: 'Bare metal', managed_hosting: 'Managed hosting', inference_endpoint: 'Inference endpoints' };
const AVAIL_LABELS = { downloadable: 'Downloadable', gated: 'Gated download', api_only: 'API only', announced: 'Announced only', withdrawn: 'Withdrawn' };
const SOURCE_LABELS = { huggingface: 'Hugging Face', ollama: 'Ollama', api: 'Official API', aggregator: 'API aggregator', github: 'GitHub', kaggle: 'Kaggle', modelscope: 'ModelScope' };

let catalog;
let countryNames = new Map();
const langNames = (() => { try { return new Intl.DisplayNames(['en'], { type: 'language' }); } catch { return null; } })();
const langName = (c) => { try { return langNames?.of(c) || c; } catch { return c; } };
const countryName = (c) => countryNames.get(c) || c;
const flag = (c) => /^[A-Z]{2}$/.test(c || '') ? String.fromCodePoint(...[...c].map((x) => 0x1f1a5 + x.charCodeAt(0))) : '';
const fmtDate = (ts) => { try { return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ts; } };
const known = (c) => c && c.value !== 'unknown' && c.value !== null && c.value !== undefined;

const TYPES = ['model', 'dataset', 'app', 'host'];
const TYPE_WORDS = { model: 'models', dataset: 'datasets', app: 'apps', host: 'hosting providers' };
const PAGE = 50;
const state = { type: 'model', q: '', country: store.get('country') || '', limit: PAGE, f: { model: {}, dataset: {}, app: {}, host: {} } };
const loaded = {}; // type -> records
const recordsOf = (t) => loaded[t] || [];
const popularity = (r) => (r.popularity || []).reduce((n, p) => n + (p.downloads_30d || 0) + (p.likes || 0) * 50 + pullsNum(p.pulls), 0);
const pullsNum = (s) => { const m = String(s || '').match(/^([\d.]+)([KMB]?)$/); return m ? +m[1] * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]] || 1) : 0; };
const fmtNum = (n) => n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : String(n);

// ---- access logic ----
function availableIn(access, country) {
  if (!access || !country) return 'unknown';
  const un = access.countries_unavailable?.value;
  const av = access.countries_available?.value;
  if (Array.isArray(un) && un.includes(country)) return 'no';
  if (Array.isArray(av)) return av.includes(country) ? 'yes' : 'no';
  if (av === 'all_except_listed' && Array.isArray(un)) return 'yes';
  return 'unknown';
}
const methodsOf = (access) => Array.isArray(access?.payment_methods?.value) ? access.payment_methods.value : [];
function recordAccesses(r) {
  if (r.type !== 'model') return r.access ? [r.access] : [];
  return (r.distributions || []).map((d) => d.access).filter(Boolean);
}
function modelCountryStatus(r, country) {
  if ((r.distributions || []).some((d) => d.availability === 'downloadable')) return 'download';
  const s = recordAccesses(r).map((a) => availableIn(a, country));
  return s.includes('yes') ? 'yes' : s.includes('unknown') || !s.length ? 'unknown' : 'no';
}
const anyNoCard = (r) => recordAccesses(r).some((a) => a.no_card_needed === true);
const CARDS = ['card_international', 'card_local'];
const payNoCard = (a) => methodsOf(a).some((m) => !CARDS.includes(m.method));
const anyFree = (r) => recordAccesses(r).some((a) => ['free', 'free_tier'].includes(a.free?.value));

// ---- filters ----
function options(values, labeler = (v) => v) {
  return [...new Set(values.filter(Boolean))].map((v) => [v, labeler(v)]).sort((a, b) => a[1].localeCompare(b[1]));
}
function filterDefs(type) {
  const recs = recordsOf(type);
  const methods = options(recs.flatMap((r) => recordAccesses(r).flatMap((a) => methodsOf(a).map((m) => m.method))), (m) => METHOD_LABELS[m] || m);
  if (type === 'model') return [
    { key: 'lang', label: 'Any language', opts: options(recs.flatMap((r) => Array.isArray(r.languages?.value) ? r.languages.value : []), langName) },
    { key: 'region', label: 'Any publisher country', opts: options(recs.map((r) => known(r.publisher_region) ? r.publisher_region.value : null), countryName) },
    { key: 'avail', label: 'Any availability', opts: options(recs.map((r) => r.availability?.value).filter((v) => v !== 'unknown'), (v) => AVAIL_LABELS[v] || v) },
    { key: 'task', label: 'Any task', opts: options(recs.flatMap((r) => r.tasks || []), (t) => t.replace(/-/g, ' ')) },
    { key: 'local', toggle: 'Runs locally' },
    { key: 'open', toggle: 'Open license' },
  ];
  if (type === 'dataset') return [
    { key: 'lang', label: 'Any language', opts: options(recs.flatMap((r) => Array.isArray(r.languages?.value) ? r.languages.value : []), langName) },
    { key: 'task', label: 'Any task', opts: options(recs.flatMap((r) => r.tasks || []), (t) => t.replace(/-/g, ' ')) },
    { key: 'size', label: 'Any size', opts: options(recs.map((r) => r.size_category)) },
    { key: 'open', toggle: 'Open license' },
    { key: 'nogate', toggle: 'No sign-in gate' },
  ];
  if (type === 'app') return [
    { key: 'cat', label: 'Any category', opts: options(recs.flatMap((r) => r.categories || []), (c) => c[0].toUpperCase() + c.slice(1)) },
    { key: 'method', label: 'Any payment method', opts: methods },
    { key: 'free', toggle: 'Free or free tier' },
    { key: 'nocard', toggle: 'Usable without a card' },
    { key: 'here', toggle: 'Available in my country', needsCountry: true },
  ];
  return [
    { key: 'dc', label: 'Data center anywhere', opts: [['__mine', 'In my country'], ...options(recs.flatMap((r) => Array.isArray(r.data_centers?.value) ? r.data_centers.value.map((d) => d.country) : []), countryName)] },
    { key: 'gpu', label: 'Any GPU', opts: options(recs.flatMap((r) => Array.isArray(r.gpu_types?.value) ? r.gpu_types.value : [])) },
    { key: 'kind', label: 'Any kind', opts: options(recs.flatMap((r) => r.kinds || []), (k) => KIND_LABELS[k] || k) },
    { key: 'method', label: 'Any payment method', opts: methods },
    { key: 'nocard', toggle: 'Pay without a card' },
  ];
}
function renderFilters() {
  const f = state.f[state.type];
  $('#filters').innerHTML = filterDefs(state.type).map((d) => {
    if (d.toggle) {
      const dis = d.needsCountry && !state.country;
      return `<label class="toggle"${dis ? ' title="Choose your country first"' : ''}><input type="checkbox" data-key="${d.key}"${f[d.key] ? ' checked' : ''}${dis ? ' disabled' : ''}> ${esc(d.toggle)}</label>`;
    }
    return `<select data-key="${d.key}" aria-label="${esc(d.label)}"><option value="">${esc(d.label)}</option>${d.opts.map(([v, l]) => `<option value="${esc(v)}"${f[d.key] === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  }).join('');
}

function matches(r) {
  const f = state.f[r.type];
  if (state.q) {
    const hay = [r.name, r.publisher, r.description, r.family, ...(r.categories || []), ...(r.tasks || []),
      ...(Array.isArray(r.languages?.value) ? r.languages.value.map(langName) : []),
      known(r.publisher_region) ? countryName(r.publisher_region.value) : ''].join(' ').toLowerCase();
    if (!state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  const hasMethod = (m) => recordAccesses(r).some((a) => methodsOf(a).some((x) => x.method === m));
  if (r.type === 'model') {
    if (f.lang && !(Array.isArray(r.languages?.value) && r.languages.value.includes(f.lang))) return false;
    if (f.region && r.publisher_region?.value !== f.region) return false;
    if (f.avail && r.availability?.value !== f.avail) return false;
    if (f.local && !r.local_ready) return false;
    if (f.open && !(known(r.license) && r.license.value !== 'custom')) return false;
    if (f.task && !(r.tasks || []).includes(f.task)) return false;
  } else if (r.type === 'dataset') {
    if (f.lang && !(Array.isArray(r.languages?.value) && r.languages.value.includes(f.lang))) return false;
    if (f.task && !(r.tasks || []).includes(f.task)) return false;
    if (f.size && r.size_category !== f.size) return false;
    if (f.open && !(known(r.license) && r.license.value !== 'custom')) return false;
    if (f.nogate && r.availability?.value === 'gated') return false;
  } else if (r.type === 'app') {
    if (f.cat && !(r.categories || []).includes(f.cat)) return false;
    if (f.method && !hasMethod(f.method)) return false;
    if (f.free && !anyFree(r)) return false;
    if (f.nocard && !anyNoCard(r)) return false;
    if (f.here && availableIn(r.access, state.country) !== 'yes') return false;
  } else {
    const dcs = Array.isArray(r.data_centers?.value) ? r.data_centers.value.map((d) => d.country) : [];
    const want = f.dc === '__mine' ? state.country : f.dc;
    if (f.dc && !dcs.includes(want)) return false;
    if (f.gpu && !(Array.isArray(r.gpu_types?.value) && r.gpu_types.value.includes(f.gpu))) return false;
    if (f.kind && !(r.kinds || []).includes(f.kind)) return false;
    if (f.method && !hasMethod(f.method)) return false;
    if (f.nocard && !payNoCard(r.access)) return false;
  }
  return true;
}

// ---- rendering ----
const badge = (text, cls = '') => `<span class="badge ${cls}">${esc(text)}</span>`;
function countryBadge(r) {
  const c = state.country;
  if (!c) return '';
  const name = countryName(c);
  if (r.type === 'dataset') return '';
  if (r.type === 'model') {
    const s = modelCountryStatus(r, c);
    if (s === 'download') return '';
    return s === 'yes' ? badge(`API available in ${name}`, 'b-ok') : s === 'no' ? badge(`API not available in ${name}`, 'b-no') : badge(`${name}: availability unknown`, 'b-unk');
  }
  if (r.type === 'host') {
    const dcs = Array.isArray(r.data_centers?.value) ? r.data_centers.value.map((d) => d.country) : null;
    const dcBadge = dcs ? (dcs.includes(c) ? badge(`Data center in ${name}`, 'b-ok') : '') : '';
    const s = availableIn(r.access, c);
    return dcBadge + (s === 'no' ? badge(`Not offered in ${name}`, 'b-no') : '');
  }
  const s = availableIn(r.access, c);
  return s === 'yes' ? badge(`Available in ${name}`, 'b-ok') : s === 'no' ? badge(`Not available in ${name}`, 'b-no') : badge(`${name}: unknown`, 'b-unk');
}
function cardBadges(r) {
  const b = [];
  if (r.warning === 'dont_touch') b.push(badge('☠️ Don\'t touch', 'b-no'));
  else if (r.warning === 'reported') b.push(badge('⚠️ Reported', 'b-warn'));
  b.push(countryBadge(r));
  if (r.type === 'model') {
    if (r.local_ready) b.push(badge('Runs locally', 'b-ok'));
    if (known(r.availability)) b.push(badge(AVAIL_LABELS[r.availability.value] || r.availability.value));
    if (known(r.parameters)) b.push(badge(r.parameters.value));
    if (known(r.license)) b.push(badge(r.license.value === 'custom' ? 'Custom license' : r.license.value));
    const langs = Array.isArray(r.languages?.value) ? r.languages.value : [];
    if (langs.length && !(langs.length === 1 && langs[0] === 'en')) b.push(badge(langs.length > 3 ? `${langs.length} languages` : langs.map(langName).join(', ')));
    const pop = popularity(r); if (pop) b.push(badge(`↓ ${fmtNum((r.popularity || []).reduce((n, p) => n + (p.downloads_30d || 0) + pullsNum(p.pulls), 0))}`));
  } else if (r.type === 'dataset') {
    if (known(r.availability)) b.push(badge(AVAIL_LABELS[r.availability.value] || r.availability.value));
    if (known(r.license)) b.push(badge(r.license.value === 'custom' ? 'Custom license' : r.license.value));
    if (r.size_category) b.push(badge(r.size_category.replace('n<', '< ').replace('<n<', ' to ').replace('K', 'K rows').replace('M', 'M rows')));
    const langs = Array.isArray(r.languages?.value) ? r.languages.value : [];
    if (langs.length && !(langs.length === 1 && langs[0] === 'en')) b.push(badge(langs.length > 3 ? `${langs.length} languages` : langs.map(langName).join(', ')));
    if (r.paper_urls?.length) b.push(badge('📄 Paper'));
  } else {
    const a = r.access;
    if (a && known(a.free) && FREE_LABELS[a.free.value]) b.push(badge(FREE_LABELS[a.free.value], a.free.value === 'paid_only' ? '' : 'b-ok'));
    const non = methodsOf(a).filter((m) => !CARDS.includes(m.method)).map((m) => METHOD_LABELS[m.method]);
    if (non.length) b.push(badge(`Pay without a card: ${[...new Set(non)].slice(0, 3).join(' · ')}`, 'b-ok'));
    else if (methodsOf(a).length) b.push(badge('Paid plans: card only'));
  }
  if (r.type === 'host' && Array.isArray(r.data_centers?.value)) {
    const cs = [...new Set(r.data_centers.value.map((d) => d.country))];
    b.push(badge(cs.map(flag).join(' ') || 'Data centers'));
  }
  if (r.verification_status !== 'verified') b.push(badge(r.verification_status === 'candidate' ? 'Not yet verified' : 'Last check failed', 'b-warn'));
  return b.join('');
}

function src(c) {
  if (!known(c) || !c.source_url) return '';
  const type = { official: 'official', third_party: 'third-party', independently_verified: 'independently verified', web_reported: 'public reports' }[c.source_type] || '';
  let host = '';
  try { host = new URL(c.source_url).hostname.replace(/^www\./, ''); } catch { /* bad URL */ }
  return ` <span class="src">(<a href="${esc(c.source_url)}" rel="noopener" target="_blank">${esc(host || 'source')}</a>, ${esc(type)}, checked ${esc(fmtDate(c.observed_at))})</span>`;
}
const unknownTxt = '<span class="unknown">unknown</span>';
function fact(label, c, fmt = (v) => esc(v)) {
  if (c === undefined) return '';
  return `<dt>${esc(label)}</dt><dd>${known(c) ? fmt(c.value) + src(c) : unknownTxt}</dd>`;
}
const countryList = (v) => v.map((c) => `${flag(c)} ${esc(countryName(c))}`).join(', ');
function accessFacts(a) {
  if (!a) return `<dl class="facts"><dt>Access</dt><dd>${unknownTxt}</dd></dl>`;
  const pm = (v) => `<ul class="dist">${v.map((m) => `<li>${esc(METHOD_LABELS[m.method] || m.method)}${m.note ? ` <span class="muted">(${esc(m.note)})</span>` : ''}</li>`).join('')}</ul>`;
  const avail = (v) => v === 'all_except_listed' ? 'Most countries, except those listed below' : countryList(v);
  let out = '<dl class="facts">';
  out += fact('Free?', a.free, (v) => esc(FREE_LABELS[v] || v) + (a.free_limits ? `: ${esc(a.free_limits)}` : ''));
  const pm0 = methodsOf(a);
  out += `<dt>Pay without a card</dt><dd>${pm0.length ? (payNoCard(a) ? 'Yes, see methods below' : 'No, paid plans need a card') : unknownTxt}</dd>`;
  out += fact('Payment methods', a.payment_methods, pm);
  out += fact('Available in', a.countries_available, avail);
  out += fact('Not available in', a.countries_unavailable, countryList);
  out += fact('Sign-up', a.signup_requirements);
  out += fact('Local currency prices', a.local_currency_pricing, (v) => v ? 'Yes' : 'No');
  return out + '</dl>';
}
function detail(r) {
  let h = '<div class="detail">';
  h += '<h3>Facts</h3><dl class="facts">';
  h += fact('Publisher country', r.publisher_region, (v) => `${flag(v)} ${esc(countryName(v))}`);
  if (r.type === 'model') {
    h += fact('Released', r.released_at);
    h += fact('Parameters', r.parameters);
    h += fact('License', r.license, (v) => v === 'custom' ? 'Custom license (see source)' : esc(v));
    h += fact('Availability', r.availability, (v) => esc(AVAIL_LABELS[v] || v));
    h += fact('Languages', r.languages, (v) => Array.isArray(v) ? esc(v.map(langName).join(', ')) : esc(v));
    if (r.local_runtimes?.length) h += `<dt>Local runtimes</dt><dd>${esc(r.local_runtimes.join(', '))}</dd>`;
  }
  if (r.type === 'dataset') {
    h += fact('License', r.license, (v) => v === 'custom' ? 'Custom license (see source)' : esc(v));
    h += fact('Availability', r.availability, (v) => esc(AVAIL_LABELS[v] || v));
    h += fact('Languages', r.languages, (v) => Array.isArray(v) ? esc(v.map(langName).join(', ')) : esc(v));
    if (r.tasks?.length) h += `<dt>Tasks</dt><dd>${esc(r.tasks.join(', ').replace(/-/g, ' '))}</dd>`;
    if (r.modalities?.length) h += `<dt>Modalities</dt><dd>${esc(r.modalities.join(', '))}</dd>`;
    if (r.formats?.length) h += `<dt>Formats</dt><dd>${esc(r.formats.join(', '))}</dd>`;
    if (r.size_category) h += `<dt>Size</dt><dd>${esc(r.size_category)} rows</dd>`;
  }
  if (r.type === 'model' && r.relations?.length) {
    const REL = { finetune_of: 'Fine-tune of', adapter_of: 'Adapter for', merge_of: 'Merge of', quantization_of: 'Quantization of', variant_of: 'Variant of', successor_of: 'Successor of' };
    h += `<dt>Based on</dt><dd>${r.relations.map((x) => `${esc(REL[x.type] || x.type)} ${/^https?:/.test(x.target) ? `<a href="${esc(x.target)}" rel="noopener" target="_blank">${esc(x.target.replace('https://huggingface.co/', ''))}</a>` : esc(x.target.split('/').pop())}`).join('; ')}</dd>`;
  }
  if (r.type === 'app') {
    h += `<dt>Categories</dt><dd>${esc((r.categories || []).join(', '))}</dd>`;
    h += fact('Interface languages', r.interface_languages, (v) => Array.isArray(v) ? esc(v.map(langName).join(', ')) : esc(v));
  }
  if (r.type === 'host') {
    h += `<dt>Kinds</dt><dd>${esc((r.kinds || []).map((k) => KIND_LABELS[k] || k).join(', '))}</dd>`;
    h += fact('Data centers', r.data_centers, (v) => v.map((d) => `${flag(d.country)} ${esc(countryName(d.country))}${d.city_or_region ? ` (${esc(d.city_or_region)})` : ''}`).join('; '));
    h += fact('GPUs', r.gpu_types, (v) => Array.isArray(v) ? esc(v.join(', ')) : esc(v));
    h += fact('Data residency (provider claim)', r.data_residency);
  }
  h += '</dl>';
  if (r.type === 'model') {
    h += '<h3>Where to get it</h3><ul class="dist">';
    for (const d of r.distributions || []) {
      h += `<li><a href="${esc(d.url)}" rel="noopener" target="_blank">${esc(SOURCE_LABELS[d.source] || d.source)}: ${esc(d.native_id || d.url)}</a> <span class="muted">${esc(AVAIL_LABELS[d.availability] || '')}${d.formats?.length ? ' · ' + esc(d.formats.join(', ')) : ''}</span>`;
      if (d.access) h += accessFacts(d.access);
      h += '</li>';
    }
    h += '</ul>';
  } else if (r.type !== 'dataset') {
    h += '<h3>Access and payment</h3>' + accessFacts(r.access);
  }
  const linkList = (urls) => urls.map((u) => { let t = u; try { t = new URL(u).hostname.replace(/^www\./, '') + new URL(u).pathname.replace(/\/$/, ''); } catch { /* keep */ } return `<a href="${esc(u)}" rel="noopener" target="_blank">${esc(t)}</a>`; }).join(' ');
  const links = [...new Set([r.url, r.launch_url, ...(r.official_urls || []), ...(r.app_store_urls || [])].filter(Boolean))];
  h += `<h3>Official links</h3><p class="links">${linkList(links)}</p>`;
  if (r.documentation_urls?.length) h += `<h3>Code and documentation</h3><p class="links">${linkList(r.documentation_urls)}</p>`;
  if (r.paper_urls?.length) h += `<h3>Papers</h3><p class="links">${linkList(r.paper_urls)}</p>`;
  h += `<p class="src">${r.verification_status === 'verified' ? 'Verified at an official source' : 'Not yet verified at an official page: treat facts with care'}. First seen ${esc(fmtDate(r.first_seen_at))}. ${r.evidence_urls?.length || 0} sources.</p>`;
  return h + '</div>';
}
function card(r) {
  const region = known(r.publisher_region) ? ` ${flag(r.publisher_region.value)}` : '';
  return `<li class="card" id="${esc(r.id.replace(/[:/]/g, '-'))}"><details><summary>
    <div class="card-head"><h2>${esc(r.name)}</h2><span class="pub">${esc(r.publisher)}${region}</span></div>
    <p class="desc">${esc(r.description)}</p>
    <div class="badges">${cardBadges(r)}</div>
    <div class="more">Details and sources ▾</div>
  </summary><div class="detail-slot" data-id="${esc(r.id)}"></div></details></li>`;
}

function render() {
  for (const t of TYPES) {
    const tab = $(`#tab-${t}`);
    tab.setAttribute('aria-selected', String(t === state.type));
    tab.querySelector('.count').textContent = catalog.counts[t] ?? '';
  }
  if (!loaded[state.type]) { $('#list').innerHTML = ''; $('#summary').textContent = 'Loading…'; $('#more-btn').hidden = true; return; }
  const all = recordsOf(state.type);
  const recs = all.filter(matches);
  const weight = (r) => (r.warning === 'dont_touch' ? 2 : 0) + (r.verification_status === 'verified' ? 0 : 1);
  recs.sort((a, b) => weight(a) - weight(b) || popularity(b) - popularity(a) || a.name.localeCompare(b.name));
  $('#list').innerHTML = recs.slice(0, state.limit).map(card).join('');
  $('#empty').hidden = recs.length > 0;
  $('#more-btn').hidden = recs.length <= state.limit;
  $('#more-btn').textContent = `Show more (${recs.length - state.limit} left)`;
  $('#summary').textContent = `${recs.length} of ${all.length} ${TYPE_WORDS[state.type]}${state.type === 'dataset' ? '' : state.country ? ` · showing access for ${countryName(state.country)}` : ' · choose your country to see what works there'}`;
}
async function ensureLoaded(t) {
  if (loaded[t]) return;
  try { loaded[t] = await (await fetch(`data/${t}s.json`)).json(); } catch { loaded[t] = []; $('#summary').textContent = 'This list could not be loaded. Try reloading the page.'; }
}

// ---- events ----
async function setType(t) { state.type = t; state.limit = PAGE; render(); await ensureLoaded(t); if (state.type === t) { renderFilters(); render(); } }
$('.tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-type]'); if (b) setType(b.dataset.type); });
$('.tabs').addEventListener('keydown', (e) => {
  const i = TYPES.indexOf(state.type);
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    const t = TYPES[(i + (e.key === 'ArrowRight' ? 1 : TYPES.length - 1)) % TYPES.length];
    setType(t); $(`#tab-${t}`).focus();
  }
});
$('#q').addEventListener('input', (e) => { state.q = e.target.value.trim(); state.limit = PAGE; render(); });
$('#more-btn').addEventListener('click', () => { state.limit += PAGE; render(); });
// Details are built only when a card is opened (thousands of listings).
$('#list').addEventListener('toggle', (e) => {
  const slot = e.target.querySelector?.('.detail-slot');
  if (!e.target.open || !slot || slot.childElementCount) return;
  const rec = recordsOf(state.type).find((r) => r.id === slot.dataset.id);
  if (rec) slot.innerHTML = detail(rec);
}, true);
$('#filters').addEventListener('change', (e) => {
  const k = e.target.dataset.key;
  if (!k) return;
  state.f[state.type][k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  state.limit = PAGE;
  render();
});
$('#country').addEventListener('change', (e) => { state.country = e.target.value; store.set('country', state.country); renderFilters(); render(); });

const themes = ['auto', 'light', 'dark'];
function applyTheme(t) {
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  $('#theme-btn').textContent = `◐ Theme: ${t}`;
}
$('#theme-btn').addEventListener('click', () => {
  const cur = store.get('theme') || 'auto';
  const next = themes[(themes.indexOf(cur) + 1) % 3];
  store.set('theme', next === 'auto' ? '' : next);
  applyTheme(next);
});
applyTheme(store.get('theme') || 'auto');

// ---- start ----
try {
  catalog = await (await fetch('data/meta.json')).json();
} catch {
  $('#summary').textContent = 'The catalog could not be loaded. Try reloading the page.';
  throw new Error('catalog load failed');
}
countryNames = new Map(catalog.countries);
$('#country').insertAdjacentHTML('beforeend', catalog.countries.map(([c, n]) => `<option value="${c}"${c === state.country ? ' selected' : ''}>${flag(c)} ${esc(n)}</option>`).join(''));
const total = Object.values(catalog.counts).reduce((a, b) => a + b, 0);
$('#generated').textContent = `Catalog built ${fmtDate(catalog.generated_at)} · ${total} listings`;
const hashType = location.hash.match(/^#(model|dataset|app|host)$/)?.[1];
await setType(hashType || state.type);
