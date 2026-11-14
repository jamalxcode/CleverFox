// CleverFox shared rendering: used by the main page (app.js) and the build (tools/build.mjs),
// which writes a static page for every listing. Pure string functions, no DOM.
export const view = { country: '', mem: 0, site: '', base: '' }; // visitor's choices; site = absolute site URL; base = relative path to the site root
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
  if (a.no_barriers) b.push(badge('🔓 No barriers', 'b-ok'));
  else if (a.barriers?.length && r.type !== 'host') b.push(badge(`🚧 ${a.barriers[0]}${a.barriers.length > 1 ? ` +${a.barriers.length - 1}` : ''}`, 'b-warn'));
  if (r.hardware) {
    const need = r.hardware.min_memory_gb;
    if (view.mem) b.push(need <= view.mem * 0.8 ? badge(`✓ Fits your ${view.mem} GB`, 'b-ok') : need <= view.mem ? badge(`⚠ Tight on ${view.mem} GB`, 'b-warn') : badge(`✗ Needs ~${need} GB`, 'b-no'));
    else b.push(badge(`🖥️ From ~${need} GB memory`));
  }
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

export function src(c) {
  if (!known(c) || !c.source_url) return '';
  const type = { official: 'official', third_party: 'third-party', independently_verified: 'independently verified', web_reported: 'public reports' }[c.source_type] || '';
  let host = '';
  try { host = new URL(c.source_url).hostname.replace(/^www\./, ''); } catch { /* bad URL */ }
  return ` <span class="src">(<a href="${esc(c.source_url)}" rel="noopener" target="_blank">${esc(host || 'source')}</a>, ${esc(type)}, checked ${esc(fmtDate(c.observed_at))})</span>`;
}
export const unknownTxt = '<span class="unknown">unknown</span>';
export function fact(label, c, fmt = (v) => esc(v)) {
  if (c === undefined) return '';
  return `<dt>${esc(label)}</dt><dd>${known(c) ? fmt(c.value) + src(c) : unknownTxt}</dd>`;
}
export const countryList = (v) => v.map((c) => `${flag(c)} ${esc(countryName(c))}`).join(', ');
export function accessFacts(a) {
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
export function glance(r) {
  const a = r.answers || {};
  const yes = (t) => `<span class="yes">✓</span> ${esc(t)}`; const no = (t) => `<span class="no">✗</span> ${esc(t)}`;
  let h = '<h3>At a glance</h3><dl class="facts glance">';
  if (a.good_for?.length) h += `<dt>Good for</dt><dd>${a.good_for.map((c) => esc(CAPS[c] || c)).join(' · ')}</dd>`;
  if (r.type === 'model') {
    const sizes = (r.distributions || []).map((d) => d.file_size_bytes).filter(Boolean).sort((x, y) => x - y);
    h += `<dt>Runs locally?</dt><dd>${a.runs_locally ? yes(`Yes${r.local_runtimes?.length ? ` (${r.local_runtimes.join(', ')})` : ''}${sizes.length ? `, downloads from ${sizes[0] >= 1e9 ? (sizes[0] / 1e9).toFixed(1) + ' GB' : Math.round(sizes[0] / 1e6) + ' MB'}` : ''}`) : no('No local version listed')}</dd>`;
  }
  if (r.type !== 'host') h += `<dt>Free?</dt><dd>${['free_download', 'free', 'free_tier', 'trial'].includes(a.free) ? yes(FREE_TEXT[a.free]) : a.free === 'paid' ? no('Paid') : '<span class="unknown">unknown</span>'}</dd>`;
  if (a.pay_without_card !== null && a.pay_without_card !== undefined) h += `<dt>Pay without a card?</dt><dd>${a.pay_without_card ? yes('Yes (see payment methods below)') : no('Paid plans need a card')}</dd>`;
  if (r.type === 'model') {
    const bm = r.benchmarks || [];
    h += `<dt>How smart is it?</dt><dd>${bm.length ? `Publisher's own results (not independently checked):<ul class="dist">${bm.map((x) => `<li>${esc(x.benchmark)}${x.metric ? ` (${esc(x.metric)})` : ''}: <strong>${esc(typeof x.value === 'number' ? +x.value.toFixed(2) : x.value)}</strong>${x.conditions ? ` <span class="muted">${esc(x.conditions)}</span>` : ''}</li>`).join('')}</ul>` : '<span class="unknown">No benchmark results published with this listing yet</span>'}</dd>`;
  }
  if (r.hardware) {
    const fit = (gb) => !view.mem ? '' : gb <= view.mem * 0.8 ? ' <span class="yes">✓ fits</span>' : gb <= view.mem ? ' <span class="muted">⚠ tight</span>' : ' <span class="no">✗ too big</span>';
    h += `<dt>What hardware do I need?</dt><dd><table class="hw"><thead><tr><th>Size</th><th>Download</th><th>Memory</th><th>Runs on</th></tr></thead><tbody>${r.hardware.options.map((o) => `<tr><td>${esc(o.label)}</td><td>${o.download_gb ? esc(o.download_gb + ' GB') : '–'}</td><td>~${esc(o.memory_gb)} GB${fit(o.memory_gb)}</td><td>${esc(deviceFor(o.memory_gb))}</td></tr>`).join('')}</tbody></table>
      <p class="src">Rough estimate from ${esc(r.hardware.options[0].basis)}, not the publisher's requirement. Longer conversations need more memory.</p>
      <p><strong>Processor:</strong> any modern 64-bit CPU can run it, but slowly, and slower the bigger the model. A graphics card (NVIDIA, or AMD on Linux) is much faster when the whole model fits in its memory. Apple Silicon Macs (M1 and later) share memory between CPU and GPU, so the Mac's total memory counts.${r.hardware.moe ? ' This is a mixture-of-experts model: it needs memory for its full size, but runs faster than its size suggests.' : ''}</p></dd>`;
  }
  h += `<dt>What do people say?</dt><dd><a href="${esc(xSearchUrl(r))}" target="_blank" rel="noopener">Reviews and reactions on X ↗</a> <span class="muted">(live search)</span></dd>`;
  if (r.highlights?.length) h += `<dt>Highlights</dt><dd><ul class="dist">${r.highlights.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></dd>`;
  if (r.type !== 'host') {
    h += `<dt>Uncensored?</dt><dd>${a.uncensored ? 'Yes: an abliterated or uncensored variant, with refusals removed by its publisher' : 'Not marked as uncensored'}</dd>`;
    h += `<dt>Gatekeeping</dt><dd>${a.barriers?.length ? `<ul class="dist">${a.barriers.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : yes(r.type === 'app' ? 'No known barriers' : `${GATE_TEXT[a.gate] || 'No sign-in needed'}, open license`)}</dd>`;
  }
  return h + '</dl>';
}
export function detail(r) {
  let h = '<div class="detail">';
  h += shareRow(r);
  h += glance(r);
  h += '<h3>Facts</h3><dl class="facts">';
  h += fact('Publisher country', r.publisher_region, (v) => `${flag(v)} ${esc(countryName(v))}`);
  if (r.type === 'model') {
    h += fact('Released', r.released_at);
    if (r.first_published && known(r.first_published)) h += fact('First on Hugging Face', r.first_published);
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
    const REL = { uncensored_variant_of: 'Uncensored variant of', finetune_of: 'Fine-tune of', adapter_of: 'Adapter for', merge_of: 'Merge of', quantization_of: 'Quantization of', variant_of: 'Variant of', successor_of: 'Successor of' };
    h += `<dt>Based on</dt><dd>${r.relations.map((x) => { const t = String(x.target || x.target_id || x.id || ''); return `${esc(REL[x.type] || x.type || 'Related to')} ${/^https?:/.test(t) ? `<a href="${esc(t)}" rel="noopener" target="_blank">${esc(t.replace('https://huggingface.co/', ''))}</a>` : esc(t.split('/').pop() || 'unknown')}`; }).join('; ')}</dd>`;
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
