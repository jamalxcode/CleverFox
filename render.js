// CleverFox shared rendering: used by the main page (app.js) and the build (tools/build.mjs),
// which writes a static page for every listing. Pure string functions, no DOM.
export const view = { country: '', mem: 0, site: '', base: '', runtimes: {} }; // visitor's choices; site = absolute site URL; base = relative path to the site root
let countryNames = new Map();
export const setCountries = (list) => { countryNames = new Map(list); };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const METHOD_LABELS = {
  card_international: 'International card', card_local: 'Local card', paypal: 'PayPal', crypto: 'Crypto',
  mobile_money: 'Mobile money', upi: 'UPI', pix: 'Pix', alipay: 'Alipay', wechat_pay: 'WeChat Pay',
  bank_transfer: 'Bank transfer', app_store_billing: 'App store billing', prepaid_or_gift_card: 'Prepaid / gift card',
  carrier_billing: 'Phone bill', other: 'Other',
};
export const FREE_LABELS = { free: 'Free', free_tier: 'Free tier', trial: 'Free trial', paid_only: 'Paid only' };
export const KIND_LABELS = { gpu_cloud: 'GPU cloud', vm: 'Virtual machines', bare_metal: 'Bare metal', managed_hosting: 'Managed hosting', inference_endpoint: 'Inference endpoints' };
export const AVAIL_LABELS = { downloadable: 'Downloadable', gated: 'Gated download', api_only: 'API only', announced: 'Announced only', withdrawn: 'Withdrawn' };
export const SOURCE_LABELS = { huggingface: 'Hugging Face', ollama: 'Ollama', api: 'Official API', aggregator: 'API aggregator', github: 'GitHub', kaggle: 'Kaggle', modelscope: 'ModelScope' };
export const langNames = (() => { try { return new Intl.DisplayNames(['en'], { type: 'language' }); } catch { return null; } })();
export const langName = (c) => { try { return langNames?.of(c) || c; } catch { return c; } };
export const countryName = (c) => countryNames.get(c) || c;
export const flag = (c) => /^[A-Z]{2}$/.test(c || '') ? String.fromCodePoint(...[...c].map((x) => 0x1f1a5 + x.charCodeAt(0))) : '';
export const fmtDate = (ts) => { try { return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ts; } };
export const known = (c) => c && c.value !== 'unknown' && c.value !== null && c.value !== undefined;
export const CAPS = { chat: '💬 Chat', writing: '✍️ Writing', coding: '💻 Coding', reasoning: '🧠 Reasoning', math: '➗ Math', analytics: '📊 Analytics', images: '🎨 Images', vision: '👁️ Vision', speech: '🎙️ Speech', video: '🎬 Video', translation: '🌐 Translation', search: '🔎 Search', tools: '🛠️ Tools & agents' };
export const FREE_TEXT = { free_download: 'Free download', free: 'Free', free_tier: 'Free tier', trial: 'Free trial', paid: 'Paid', unknown: 'Price unknown' };
export const DEVICES = [[4, 'a phone or Raspberry Pi (4 GB)'], [8, 'a basic laptop with 8 GB'], [16, 'a 16 GB laptop or Mac, or a 12–16 GB graphics card'], [24, 'a 24 GB graphics card (e.g. RTX 3090/4090) or a 32 GB Mac'], [48, 'a 48 GB graphics card or a 64 GB Mac or PC'], [96, 'a 128 GB Mac or several graphics cards'], [Infinity, 'a server with several data-center GPUs']];
export const deviceFor = (gb) => DEVICES.find(([m]) => gb <= m)[1];
export const GATE_TEXT = { none: 'No sign-in needed', login_and_terms: 'Log in and accept terms', approval: 'Needs approval' };
export const popularity = (r) => (r.popularity || []).reduce((n, p) => n + (p.downloads_30d || 0) + (p.likes || 0) * 50 + pullsNum(p.pulls), 0);
export const pullsNum = (s) => { const m = String(s || '').match(/^([\d.]+)([KMB]?)$/); return m ? +m[1] * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]] || 1) : 0; };
export const fmtNum = (n) => n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : String(n);

// ---- access logic ----
export function availableIn(access, country) {
  if (!access || !country) return 'unknown';
  const un = access.countries_unavailable?.value;
  const av = access.countries_available?.value;
  if (Array.isArray(un) && un.includes(country)) return 'no';
  if (Array.isArray(av)) return av.includes(country) ? 'yes' : 'no';
  if (av === 'all_except_listed' && Array.isArray(un)) return 'yes';
  return 'unknown';
}
export const methodsOf = (access) => Array.isArray(access?.payment_methods?.value) ? access.payment_methods.value : [];
export function recordAccesses(r) {
  if (r.type !== 'model') return r.access ? [r.access] : [];
  return (r.distributions || []).map((d) => d.access).filter(Boolean);
}
export function modelCountryStatus(r, country) {
  if ((r.distributions || []).some((d) => d.availability === 'downloadable')) return 'download';
  const s = recordAccesses(r).map((a) => availableIn(a, country));
  return s.includes('yes') ? 'yes' : s.includes('unknown') || !s.length ? 'unknown' : 'no';
}
export const anyNoCard = (r) => recordAccesses(r).some((a) => a.no_card_needed === true);
export const CARDS = ['card_international', 'card_local'];
export const payNoCard = (a) => methodsOf(a).some((m) => !CARDS.includes(m.method));
export const anyFree = (r) => recordAccesses(r).some((a) => ['free', 'free_tier'].includes(a.free?.value));

// ---- rendering ----
export const badge = (text, cls = '') => `<span class="badge ${cls}">${esc(text)}</span>`;
export function countryBadge(r) {
  const c = view.country;
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
export function goodForLine(r) {
  const g = r.answers?.good_for || [];
  return g.length ? `<p class="goodfor"><span class="muted">Good for:</span> ${g.map((c) => esc(CAPS[c] || c)).join(' · ')}</p>` : '';
}
export function cardBadges(r) {
  const b = [];
  const a = r.answers || {};
  if (a.no_barriers) b.push(badge('🕊️ No barriers', 'b-ok'));
  else if (a.barriers?.length && r.type !== 'host') b.push(badge(`🚧 ${a.barriers[0]}${a.barriers.length > 1 ? ` +${a.barriers.length - 1}` : ''}`, 'b-warn'));
  if (r.hardware) {
    const need = r.hardware.min_memory_gb;
    if (view.mem) b.push(need <= view.mem * 0.8 ? badge(`✓ Fits your ${view.mem} GB`, 'b-ok') : need <= view.mem ? badge(`⚠ Tight on ${view.mem} GB`, 'b-warn') : badge(`✗ Needs ~${need} GB`, 'b-no'));
    else b.push(badge(`🖥️ ${r.hardware.recommended_gb || need} GB+ recommended`));
  }
  if (r.platforms && r.type === 'model') b.push(`<span class="badge" title="Runs on ${Object.keys(r.platforms).map((p) => PLATFORMS[p]?.[1]).join(', ')}">${platformIcons(r)}</span>`);
  if (a.uncensored) b.push(badge('Uncensored / abliterated', 'b-warn'));
  if (a.benchmarks) b.push(badge(`📊 ${a.benchmarks} benchmark${a.benchmarks > 1 ? 's' : ''} (self-reported)`));
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

// Source as a small ⓘ link: hover or long-press shows where the fact came from and when.
// Where it runs: 🪟 Windows · 🍎 macOS · 🐧 Linux · 📱 Phone · ☁️ Cloud, each from its runtimes.
export const PLATFORMS = { windows: ['🪟', 'Windows'], macos: ['🍎', 'macOS'], linux: ['🐧', 'Linux'], phone: ['📱', 'Phone'], cloud: ['☁️', 'Cloud'] };
const viaName = (v) => view.runtimes?.[v]?.name || v;
export function platformIcons(r) {
  if (!r.platforms) return '';
  return Object.keys(PLATFORMS).filter((p) => r.platforms[p]).map((p) => PLATFORMS[p][0]).join('');
}
export function platformLine(r) {
  if (!r.platforms) return '';
  const parts = Object.keys(PLATFORMS).filter((p) => r.platforms[p]).map((p) => `<span class="it" title="${esc(`${PLATFORMS[p][1]} via ${r.platforms[p].map(viaName).join(', ')}`)}">${PLATFORMS[p][0]} ${PLATFORMS[p][1]}</span>`);
  const via = [...new Set(Object.values(r.platforms).flat())].filter((v) => view.runtimes?.[v]);
  return `<p class="ln">🏃 <strong>Runs on:</strong> ${parts.join('<span class="sep"> · </span>')}${via.length ? ` <span class="muted">via ${via.map((v) => `<a href="${esc(view.runtimes[v].docs)}" rel="noopener" target="_blank">${esc(view.runtimes[v].name)}</a>`).join(', ')}</span>` : ''}</p>`;
}
export function src(c) {
  if (!known(c) || !c.source_url) return '';
  const type = { official: 'official', third_party: 'third-party', independently_verified: 'independently verified', web_reported: 'public reports' }[c.source_type] || '';
  let host = '';
  try { host = new URL(c.source_url).hostname.replace(/^www\./, ''); } catch { /* bad URL */ }
  return `<a class="src-i" href="${esc(c.source_url)}" rel="noopener" target="_blank" title="Source: ${esc(host)} · ${esc(type)} · checked ${esc(fmtDate(c.observed_at))}" aria-label="Source: ${esc(host)}">ⓘ</a>`;
}
export const unknownTxt = '<span class="unknown">unknown</span>';
export const countryList = (v) => v.map((c) => `${flag(c)} ${esc(countryName(c))}`).join(', ');
const gb = (bytes) => bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`;
const ok = '<span class="yes">✓</span>'; const bad = '<span class="no">✗</span>';
const item = (emoji, html, title = '') => `<span class="it"${title ? ` title="${esc(title)}"` : ''}>${emoji} ${html}</span>`;
const line = (items) => { const xs = items.filter(Boolean); return xs.length ? `<p class="ln">${xs.join('<span class="sep"> · </span>')}</p>` : ''; };
const claimVal = (c, fmt = (v) => esc(v)) => known(c) ? `${fmt(c.value)}${src(c)}` : null;
const DEVICE_SHORT = [[4, '📱 phone / Pi'], [8, '💻 8 GB laptop'], [16, '💻 16 GB laptop / Mac'], [24, '🎮 24 GB GPU / 32 GB Mac'], [48, '🖥️ 48 GB GPU / 64 GB Mac'], [96, '🖥️ 128 GB Mac / multi-GPU'], [Infinity, '🏢 server GPUs']];
const deviceShort = (g) => DEVICE_SHORT.find(([m]) => g <= m)[1];
const fitMark = (g) => !view.mem ? '' : g <= view.mem * 0.8 ? ` ${ok}` : g <= view.mem ? ' ⚠' : ` ${bad}`;
const licText = (v) => v === 'custom' ? 'custom license' : esc(v);

// Access and payment in two or three lines (apps, hosts, paid APIs).
export function accessFacts(a) {
  if (!a) return line([item('💳', unknownTxt)]);
  const pm = methodsOf(a);
  const freeTxt = known(a.free) ? `${esc(FREE_LABELS[a.free.value] || a.free.value)}${src(a.free)}` : null;
  const av = a.countries_available?.value; const un = a.countries_unavailable?.value;
  const where = view.country && (av || un) ? (availableIn(a, view.country) === 'yes' ? `${ok} ${flag(view.country)} ${esc(countryName(view.country))}` : availableIn(a, view.country) === 'no' ? `${bad} ${flag(view.country)} ${esc(countryName(view.country))}` : null) : null;
  return line([
    freeTxt && item('🆓', freeTxt, a.free_limits || ''),
    pm.length && item('💳', `${payNoCard(a) ? `${ok} no card needed` : `${bad} card only`}${src(a.payment_methods)}`),
    pm.length && item('', pm.map((m) => `<span class="chip" title="${esc(m.note || '')}">${esc(METHOD_LABELS[m.method] || m.method)}${m.note ? '*' : ''}</span>`).join(' ')),
  ]) + line([
    where && item('📍', where),
    av === 'all_except_listed' && item('🌍', `most countries${Array.isArray(un) && un.length ? `, not ${un.map(flag).join('')}` : ''}${src(a.countries_available)}`),
    Array.isArray(av) && item('🌍', `${av.length > 6 ? `${av.length} countries` : countryList(av)}${src(a.countries_available)}`),
    known(a.signup_requirements) && item('📝', `${esc(String(a.signup_requirements.value).slice(0, 80))}${src(a.signup_requirements)}`),
    known(a.local_currency_pricing) && item('💱', `${a.local_currency_pricing.value ? `${ok} local prices` : 'USD/EUR prices'}${src(a.local_currency_pricing)}`),
  ]);
}

// "At a glance": emoji-led lines, several related facts per line.
export function glance(r) {
  const a = r.answers || {};
  let h = '<div class="glance">';
  if (a.good_for?.length) h += line([`<span class="it">🎯 <strong>${a.good_for.map((c) => esc((CAPS[c] || c).replace(/^\S+\s/, ''))).join(' · ')}</strong></span>`]);
  const isFree = ['free_download', 'free', 'free_tier', 'trial'].includes(a.free);
  const lic = r.license && known(r.license) ? `${licText(r.license.value)}${a.license_kind === 'open' ? ` ${ok} commercial` : a.license_kind === 'non_commercial' ? ` ${bad} commercial` : ''}${src(r.license)}` : null;
  if (r.type === 'model' || r.type === 'dataset') {
    const sizes = (r.distributions || []).map((d) => d.file_size_bytes).filter(Boolean).sort((x, y) => x - y);
    h += line([
      r.type === 'model' && item('💻', a.runs_locally ? `${ok} local${r.local_runtimes?.length ? ` <span class="muted">${esc(r.local_runtimes.join(', '))}</span>` : ''}` : `${bad} no local version`),
      sizes.length && item('⬇️', `from ${gb(sizes[0])}`),
      item('🆓', isFree ? `${ok} ${esc(FREE_TEXT[a.free])}` : a.free === 'paid' ? `${bad} paid` : unknownTxt),
      item(a.gate === 'none' ? '🚪' : '🔒', esc(GATE_TEXT[a.gate] || 'No sign-in')),
      item('📜', lic || unknownTxt),
    ]);
  }
  h += platformLine(r);
  if (r.hardware) {
    const o = r.hardware.options;
    const rec = o[0].recommended_gb || o[0].memory_gb;
    h += line([item('🖥️', `needs ~${o[0].memory_gb} GB${fitMark(o[0].memory_gb)}`, `Rough estimate from ${o[0].basis}, not the publisher's requirement`), item('👍', `<strong>${rec} GB recommended</strong> → ${esc(deviceShort(rec))}`, 'Smallest standard memory size with about 25% headroom for the system and longer conversations')]);
    if (o.length > 1) h += line([item('📐', o.map((x) => `<span class="chip" title="${x.download_gb ? `${x.download_gb} GB download · ` : ''}needs ~${x.memory_gb} GB">${esc(x.label)} → ${x.recommended_gb || x.memory_gb} GB${fitMark(x.memory_gb)}</span>`).join(' '))]);
    h += line([item('⚙️', 'CPU works, slowly'), item('🎮', 'GPU fast if it fits'), item('🍎', 'Mac: shared memory counts'), r.hardware.moe && item('⚡', 'MoE: faster than its size'), '<span class="muted">estimates</span>']);
  }
  if (r.type === 'model') {
    const bm = r.benchmarks || [];
    h += line([bm.length ? item('📊', bm.slice(0, 4).map((x) => `<span class="chip">${esc(x.benchmark)} <strong>${esc(typeof x.value === 'number' ? +x.value.toFixed(1) : x.value)}</strong></span>`).join(' ') + ' <span class="muted">self-reported</span>', 'Publisher\'s own results, not independently checked') : item('🧠', '<span class="unknown">no benchmarks published</span>')]);
    const langs = Array.isArray(r.languages?.value) ? r.languages.value : [];
    const ctx = r.ollama?.context || r.distributions?.find((d) => d.context)?.context;
    h += line([
      ctx && item('📏', `${esc(ctx)} context`),
      a.good_for?.includes('reasoning') && item('🧠', 'thinking'),
      a.good_for?.includes('tools') && item('🛠️', 'tools'),
      a.good_for?.includes('vision') && item('👁️', 'vision'),
      r.hardware?.moe && item('⚡', 'MoE'),
      langs.length && item('🗣️', langs.length > 4 ? `${langs.length} languages` : esc(langs.map(langName).join(', ')), langs.map(langName).join(', ')),
    ]);
  }
  if (a.uncensored || a.barriers?.length) h += line([a.uncensored && item('✂️', '<strong>uncensored</strong>', 'Abliterated or uncensored variant: refusals removed by its publisher'), ...(a.barriers || []).map((x) => item('🚧', esc(x)))]);
  return h + '</div>';
}

export function detail(r) {
  let h = '<div class="detail">';
  h += shareRow(r);
  h += glance(r);
  // Facts: one or two lines; unknown fields gathered at the end.
  const unknown = [];
  const f = (emoji, label, c, fmt) => { if (c === undefined) return null; const v = claimVal(c, fmt); if (!v) { unknown.push(label); return null; } return item(emoji, v, label); };
  const facts = [f('🌍', 'publisher country', r.publisher_region, (v) => `${flag(v)} ${esc(countryName(v))}`)];
  if (r.type === 'model') {
    facts.push(f('📅', 'release date', r.released_at), r.first_published && known(r.first_published) ? item('🤗', `${claimVal(r.first_published)}`, 'First published on Hugging Face') : null, f('⚙️', 'parameters', r.parameters));
    if (!known(r.languages)) unknown.push('languages');
  }
  if (r.type === 'dataset') facts.push(r.size_category && item('📦', `${esc(r.size_category)} rows`), r.formats?.length && item('🗂️', esc(r.formats.join(', '))), f('🗣️', 'languages', r.languages, (v) => Array.isArray(v) ? esc(v.length > 4 ? `${v.length} languages` : v.map(langName).join(', ')) : esc(v)));
  if (r.type === 'app') facts.push(r.categories?.length && item('🏷️', esc(r.categories.join(', '))), f('🗣️', 'interface languages', r.interface_languages, (v) => Array.isArray(v) ? esc(v.length > 4 ? `${v.length} languages` : v.map(langName).join(', ')) : esc(v)));
  if (r.type === 'host') facts.push(r.kinds?.length && item('🏷️', esc(r.kinds.map((k) => KIND_LABELS[k] || k).join(', '))), f('📍', 'data centers', r.data_centers, (v) => v.map((d) => `<span title="${esc(d.city_or_region || '')}">${flag(d.country)}</span>`).join(' ')), f('🎮', 'GPUs', r.gpu_types, (v) => Array.isArray(v) ? esc(v.join(', ')) : esc(v)), f('🔐', 'data residency', r.data_residency, (v) => esc(String(v).slice(0, 90))));
  if (r.type === 'model' && r.relations?.length) {
    const REL = { uncensored_variant_of: 'uncensored variant of', finetune_of: 'fine-tune of', adapter_of: 'adapter for', merge_of: 'merge of', quantization_of: 'quantization of', variant_of: 'variant of', successor_of: 'successor of' };
    facts.push(item('🧬', r.relations.slice(0, 2).map((x) => { const t = String(x.target || x.target_id || x.id || ''); return `${esc(REL[x.type] || x.type || 'related to')} ${/^https?:/.test(t) ? `<a href="${esc(t)}" rel="noopener" target="_blank">${esc(t.replace('https://huggingface.co/', ''))}</a>` : esc(t.split('/').pop() || '?')}`; }).join('; ')));
  }
  h += line(facts);
  if (unknown.length) h += `<p class="ln muted">❓ Unknown: ${esc(unknown.join(', '))}</p>`;
  // Where to get it, payment, links: compact lines.
  if (r.type === 'model') {
    h += line([item('⬇️', (r.distributions || []).map((d) => `<a href="${esc(d.url)}" rel="noopener" target="_blank" title="${esc((AVAIL_LABELS[d.availability] || '') + (d.formats?.length ? ' · ' + d.formats.join(', ') : '') + (d.file_size_bytes ? ' · ' + gb(d.file_size_bytes) : ''))}">${esc(SOURCE_LABELS[d.source] || d.source)}${d.source === 'ollama' ? ' ' + esc(String(d.native_id).split(':')[1] || '') : ''}</a>`).join(' · '))]);
    for (const d of (r.distributions || []).filter((x) => x.access)) h += `<p class="ln muted">${esc(SOURCE_LABELS[d.source] || d.source)} access:</p>` + accessFacts(d.access);
  } else if (r.type !== 'dataset') {
    h += accessFacts(r.access);
  }
  const short = (u) => { try { const x = new URL(u); return x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/$/, ''); } catch { return u; } };
  const linkList = (urls, max = 4) => urls.slice(0, max).map((u) => `<a href="${esc(u)}" rel="noopener" target="_blank">${esc(short(u).slice(0, 48))}</a>`).join(' · ') + (urls.length > max ? ` <span class="muted">+${urls.length - max}</span>` : '');
  const links = [...new Set([r.url, r.launch_url, ...(r.official_urls || []), ...(r.app_store_urls || [])].filter(Boolean))];
  h += line([item('🔗', linkList(links, 3)), r.documentation_urls?.length && item('🛠️', linkList(r.documentation_urls, 3)), r.paper_urls?.length && item('📄', r.paper_urls.slice(0, 4).map((u, i) => `<a href="${esc(u)}" rel="noopener" target="_blank">paper${r.paper_urls.length > 1 ? ' ' + (i + 1) : ''}</a>`).join(' · '))]);
  h += `<p class="ln src">${r.verification_status === 'verified' ? '✅ Verified at an official source' : '⚠️ Not yet verified: treat facts with care'} · first seen ${esc(fmtDate(r.first_seen_at))} · ${r.evidence_urls?.length || 0} sources</p>`;
  return h + '</div>';
}
export function card(r) {
  const region = known(r.publisher_region) ? ` ${flag(r.publisher_region.value)}` : '';
  return `<li class="card" id="${esc(r.id.replace(/[:/]/g, '-'))}"><details><summary>
    <div class="card-head"><h2>${esc(r.name)}</h2><span class="pub">${esc(r.publisher_name || r.publisher)}${region}</span></div>
    <p class="desc">${esc(r.description)}</p>
    ${goodForLine(r)}
    <div class="badges">${cardBadges(r)}</div>
    <div class="more">Details and sources ▾</div>
  </summary><div class="detail-slot" data-id="${esc(r.id)}"></div></details></li>`;
}


// ---- links: its own page, X reactions, sharing ----
// Each listing has a static page at l/<type>/<publisher>/<name>/ (written by tools/build.mjs).
export const listingPath = (r) => `l/${r.id.replace(/^cf:/, '').replace(':', '/')}/`;
export const listingUrl = (r) => `${view.site}${listingPath(r)}`;
// Live X search for the listing's name, for reviews and reactions.
export function xSearchUrl(r) {
  const name = r.name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const q = name.length <= 3 ? `${name} ${r.publisher_name || r.publisher}` : /\s/.test(name) ? `"${name}"` : name;
  return `https://x.com/search?q=${encodeURIComponent(q)}&src=typed_query&f=live`;
}
export function shareRow(r) {
  const url = listingUrl(r);
  const text = `${r.name} on CleverFox: ${(r.answers?.good_for || []).slice(0, 3).map((c) => (CAPS[c] || c).replace(/^\S+\s/, '')).join(', ') || r.description}`;
  return `<div class="share" data-url="${esc(url)}" data-title="${esc(r.name)}" data-text="${esc(text)}">
    <a class="share-btn" href="${esc(view.base + listingPath(r))}">🔗 Its own page</a>
    <button type="button" class="share-btn" data-act="copy">📋 Copy link</button>
    <button type="button" class="share-btn" data-act="share" hidden>📤 Share…</button>
    <a class="share-btn" href="https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener">𝕏 Post</a>
    <a class="share-btn" href="https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}" target="_blank" rel="noopener">💬 WhatsApp</a>
    <a class="share-btn" href="${esc(xSearchUrl(r))}" target="_blank" rel="noopener">👀 Reactions on X</a>
  </div>`;
}
// Browser only: makes the share buttons work (copy, the phone's share menu).
export function wireShare(root) {
  if (navigator.share) root.querySelectorAll?.('[data-act="share"]').forEach((b) => { b.hidden = false; });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest?.('[data-act]'); if (!b) return;
    const box = b.closest('.share');
    if (b.dataset.act === 'copy') {
      try { await navigator.clipboard.writeText(box.dataset.url); b.textContent = '✓ Copied'; } catch { prompt('Copy this link:', box.dataset.url); }
      setTimeout(() => { b.textContent = '📋 Copy link'; }, 2000);
    } else if (b.dataset.act === 'share') {
      try { await navigator.share({ title: box.dataset.title, text: box.dataset.text, url: box.dataset.url }); } catch { /* cancelled */ }
    }
  });
}
