// CleverFox shared rendering: used by the main page (app.js) and the build (tools/build.mjs),
// which writes a static page for every listing. Pure string functions, no DOM.
export const view = { country: '', mem: 0, ulang: '', site: '', base: '', runtimes: {}, storePayments: null }; // visitor's choices; site = absolute site URL; base = relative path to the site root
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
export const SOURCE_LABELS = { huggingface: 'Hugging Face', ollama: 'Ollama', api: 'Official API', aggregator: 'API aggregator', github: 'GitHub', kaggle: 'Kaggle', modelscope: 'ModelScope', replicate: 'Replicate' };
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
export const popularity = (r) => (r.popularity || []).reduce((n, p) => n + (p.downloads_30d || 0) + (p.likes || 0) * 50 + pullsNum(p.pulls) + (p.runs || 0) / 10, 0);
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
  // Apple's own storefront data: in that country's App Store means available there. Absent doesn't mean unavailable (the web may work).
  if (Array.isArray(access.app_store_countries?.value) && access.app_store_countries.value.includes(country)) return 'yes';
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
// With a country, only ways to pay that apply there count (see methodFor).
export const payNoCard = (a, c) => methodsOf(a).some((m) => !CARDS.includes(m.method) && methodFor(m, c));
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
// ---- the verdict strip: what this listing means for *you*, in plain words (✓ yes · ✗ no · ! maybe · ? unknown) ----
// Built only from stated facts (memory needed, country lists, ways to pay, free status, gates, licenses).
const V = (state, text, title = '') => ({ state, text, title });
// A payment method whose note names other countries, but not the chosen one, doesn't count for that country
// ("Pix · Brazil" isn't a way to pay in Kenya). Without a chosen country, or with no country in the note, it counts.
const EEA = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO'];
const PAY_ALIASES = [[/\bUK\b|\bU\.K\./, ['GB']], [/\bUSA?\b|\bU\.S\./, ['US']], [/\bUAE\b/, ['AE']], [/\bEEA\b|\bEU\b|\bEurope(an)?\b|\bSEPA\b/, EEA]];
export function methodFor(m, c) {
  if (!c || !m.note) return true;
  const named = [...countryNames.entries()].filter(([, n]) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(m.note)).map(([k]) => k);
  for (const [re, codes] of PAY_ALIASES) if (re.test(m.note)) named.push(...codes);
  return !named.length || named.includes(c);
}
const isEstimate = (h) => h?.estimate ?? (h?.options?.length && h.options.every((o) => /^parameter/i.test(o.basis || '')));
const onlineFrom = (r) => r.online_from ?? (r.online?.length ? (r.online.some((p) => p.free) ? 0 : Math.min(...r.online.map((p) => p.output ?? Infinity))) : null);
export function verdicts(r) {
  const out = []; const a = r.answers || {}; const c = view.country; const cn = c ? countryName(c) : '';
  const lang = view.ulang ? langName(view.ulang) : '';
  if (r.type === 'model') {
    const h = r.hardware; const f = onlineFrom(r);
    if (h) {
      const need = h.min_memory_gb; const est = isEstimate(h);
      if (view.mem) out.push(need > view.mem ? V('no', `Needs ~${need} GB, more than your ${view.mem} GB`) : est ? V('maybe', `May fit your ${view.mem} GB (rough estimate)`) : need <= view.mem * 0.8 ? V('yes', `Fits your ${view.mem} GB`) : V('maybe', `Tight on your ${view.mem} GB`));
      else out.push(V('info', `Runs on your own device, ${h.recommended_gb || need} GB memory or more${est ? ' (estimate)' : ''}`));
    } else if (r.local_ready) out.push(V('yes', 'Runs on your own device'));
    else if (a.online) out.push(V('info', 'Online only: no download'));
    else if ((r.distributions || []).some((d) => d.availability === 'downloadable')) out.push(V('info', 'Downloadable, but needs some setup to run'));
    else out.push(V('unk', 'No version to run yourself found'));
    if (a.online) out.push(f === 0 ? V('yes', r.local_ready ? 'Also free online' : 'Free online') : V('info', `${r.local_ready ? 'Also online' : 'Online'}${Number.isFinite(f) ? ` from $${f} per million tokens` : ''}`));
    if (a.free === 'free_download') out.push(V('yes', 'Free to download'));
    else if (a.free === 'paid') out.push(V('no', 'Paid'));
    if (c && !r.local_ready && (r.distributions || []).some((d) => d.access)) { const s = modelCountryStatus(r, c); out.push(s === 'yes' ? V('yes', `API works in ${cn}`) : s === 'no' ? V('no', `API not available in ${cn}`) : V('unk', `${cn}: not stated`)); }
    if (a.no_barriers) out.push(V('yes', 'No sign-up, open license'));
    else if (a.barriers?.length) out.push(V('maybe', a.barriers[0]));
  } else if (r.type === 'dataset') {
    out.push(a.gate && a.gate !== 'none' ? V('maybe', GATE_TEXT[a.gate] || 'Sign-in needed') : V('yes', 'Download without signing in'));
    out.push(a.license_kind === 'open' ? V('yes', 'Commercial use allowed') : a.license_kind === 'non_commercial' ? V('no', 'No commercial use') : V('unk', 'License terms unclear'));
  } else {
    const acc = r.access;
    if (c) {
      const dcHere = r.type === 'host' && Array.isArray(r.data_centers?.value) && r.data_centers.value.some((d) => d.country === c);
      const s = availableIn(acc, c);
      out.push(s === 'no' ? V('no', `Not available in ${cn}`) : dcHere ? V('yes', `Data center in ${cn}`) : s === 'yes' ? V('yes', `Works in ${cn}`) : V('unk', `${cn}: not stated`));
    } else out.push(V('ask', 'Choose your country to check where it works'));
    const fv = acc?.free?.value;
    out.push(fv === 'free' ? V('yes', 'Free') : fv === 'free_tier' ? V('yes', 'Free plan') : fv === 'trial' ? V('maybe', 'Free trial only') : fv === 'paid_only' ? V('no', 'Paid only') : r.store_price?.free_download ? V('info', 'Free to download (App Store); plans not stated') : V('unk', 'Price not stated'));
    const allNon = methodsOf(acc).filter((m) => !CARDS.includes(m.method));
    const non = [...new Set(allNon.filter((m) => methodFor(m, c)).map(shortPay))];
    const play = playNoCard(r, c);
    if (non.length) out.push(V('yes', `Pay without a card: ${non.slice(0, 3).join(', ')}`));
    else if (play.length) out.push(V('yes', `Pay without a card via Google Play: ${[...new Set(play.map(shortPay))].slice(0, 3).join(', ')}`));
    else if (allNon.length && c) out.push(V('maybe', `Card-free ways to pay are for other countries, not ${cn}`));
    else if (methodsOf(acc).length && fv !== 'free') out.push(V('no', 'Paid plans take cards only'));
    if (r.on_device) out.push(V('yes', 'Works offline on your phone'));
  }
  if (lang && r.type !== 'host') {
    const list = r.type === 'app' ? r.interface_languages : r.languages;
    out.push(speaks(r, view.ulang) ? V('yes', `Speaks ${lang}`) : Array.isArray(list?.value) ? V('no', `No ${lang} listed`) : V('unk', `${lang}: not stated`));
  }
  return out.slice(0, 6);
}
const V_ICON = { yes: '✓', no: '✗', maybe: '!', unk: '?', info: '•', ask: '→' };
export function verdictStrip(r) {
  const v = verdicts(r);
  return v.length ? `<ul class="verdicts">${v.map((x) => `<li class="v v-${x.state}"${x.title ? ` title="${esc(x.title)}"` : ''}><span class="v-ic" aria-hidden="true">${V_ICON[x.state]}</span> ${esc(x.text)}</li>`).join('')}</ul>` : '';
}

// A plain sentence of what it is, for imported listings whose description is only a template ("… published by X on Hugging Face").
const TEMPLATED = /^(?:[\w-]+ )?model published by .+ on Hugging Face|^Local model in the Ollama library|^(?:[\w-]+ )?model (?:run by its maker|published by .+) on Replicate|^(?:[\w-]+ )?model by .+, available through OpenRouter/;
export function plainWhat(r) {
  if (r.type !== 'model' || !TEMPLATED.test(r.description || '')) return r.description;
  const g = r.answers?.good_for || []; const t = r.tasks || [];
  const what = t.includes('automatic-speech-recognition') ? 'Turns speech into text' : t.includes('text-to-speech') ? 'Turns text into speech'
    : g.includes('images') ? 'Makes and edits images' : g.includes('video') ? 'Makes videos' : g.includes('coding') ? 'Writes and explains code'
    : g.includes('vision') ? 'Chats about images and text' : g.includes('chat') || g.includes('writing') ? 'Chats and writes' : g.includes('translation') ? 'Translates text'
    : g.includes('search') ? 'Turns text into numbers for search tools (an embedding model, not a chatbot)' : t.includes('text-classification') ? 'Sorts text into labels (not a chatbot)' : 'An AI model';
  const where = r.local_ready ? ', and runs on your own device' : r.answers?.online ? ', online through API providers' : '';
  return `${what}${where}.`;
}

// Flags: warnings always, then at most a few notable positives. Everything else goes in the quiet facts line.
export function cardBadges(r) {
  const warn = []; const good = []; const a = r.answers || {};
  if (r.verification_status !== 'verified') warn.push(badge(r.verification_status === 'candidate' ? (r.research ? '⚠️ Not yet verified: collected automatically from official pages' : (r.type === 'app' || r.type === 'host') ? '⚠️ Not yet verified: facts from search results' : 'Not yet verified') : '⚠️ Last check failed', 'b-warn'));
  if (r.warning === 'dont_touch') warn.push(badge('☠️ Don\'t touch', 'b-no'));
  else if (r.warning === 'reported') warn.push(badge('⚠️ Reported', 'b-warn'));
  if (r.possibly_discontinued) warn.push(`<span class="badge b-warn" title="${esc(r.possibly_discontinued.reason)}">⚠️ Possibly discontinued</span>`);
  if (r.listing_status?.value === 'removed_at_source') warn.push(`<span class="badge b-warn" title="Its page at the source no longer exists (checked ${esc(fmtDate(r.listing_status.checked_at))}); kept here for the record">⚠️ Removed at its source</span>`);
  if (r.lookalikes?.count) warn.push(`<span class="badge b-warn" title="${esc(`${r.lookalikes.count} App Store apps use the name ${r.lookalikes.brand} but come from other sellers. The official one is by ${r.official_store?.seller}.`)}">⚠️ ${r.lookalikes.count} look-alike apps</span>`);
  if (r.access_check?.changed?.length) warn.push(`<span class="badge b-warn" title="A pricing, payment or availability page changed after these facts were checked">⚠️ Pricing page changed</span>`);
  else if (r.access_check?.stale) warn.push(badge('⏳ Access facts are old', 'b-warn'));
  if (a.uncensored) warn.push(`<span class="badge b-warn" title="Changed by someone other than the maker to refuse fewer requests">✂️ Uncensored</span>`);
  const eci = (r.independent_benchmarks || []).find((x) => x.id === 'epoch_eci'); const aai = (r.independent_benchmarks || []).find((x) => x.id === 'aa_intelligence');
  if (eci) good.push(`<span class="badge b-ok" title="Epoch Capabilities Index (Epoch AI), an independent score">🧠 ECI ${esc(eci.display)}</span>`);
  else if (aai) good.push(`<span class="badge b-ok" title="Artificial Analysis Intelligence Index, an independent score">🧠 AA ${esc(aai.display)}</span>`);
  if (a.x_praised) good.push(`<span class="badge b-ok" title="Praised on X by several accounts, with likes and reposts">📣 Praised on X</span>`);
  if ((r.type === 'app' || r.type === 'host') && r.access?.local_currency_pricing?.value === true) good.push(badge('💱 Local prices', 'b-ok'));
  return [...warn, ...good.slice(0, Math.max(0, 3 - warn.length))].join('');
}
// The quiet facts line: raw details for people who want them (license once, size, downloads, platforms…).
export function metaLine(r) {
  const m = []; const a = r.answers || {};
  const lic = known(r.license) ? (r.license.value === 'custom' ? 'custom license' : r.license.value) : null;
  if (r.type === 'model') {
    if (known(r.availability) && r.availability.value !== 'downloadable') m.push(AVAIL_LABELS[r.availability.value] || r.availability.value);
    if (known(r.parameters)) m.push(r.parameters.value);
    if (r.platforms) m.push(Object.keys(PLATFORMS).filter((p) => r.platforms[p]).map((p) => PLATFORMS[p][1]).join(', '));
    if (lic) m.push(lic);
    const langs = Array.isArray(r.languages?.value) ? r.languages.value : [];
    if (langs.length && !(langs.length === 1 && langs[0] === 'en')) m.push(langs.length > 3 ? `${langs.length} languages` : langs.map(langName).join(', '));
    const dl = (r.popularity || []).reduce((n, p) => n + (p.downloads_30d || 0) + pullsNum(p.pulls), 0); if (dl) m.push(`${fmtNum(dl)} downloads`);
    const runs = (r.popularity || []).reduce((n, p) => n + (p.runs || 0), 0); if (runs) m.push(`${fmtNum(runs)} runs on Replicate`);
    if (a.benchmarks && !r.independent_benchmarks?.length) m.push(`${a.benchmarks} self-reported benchmark${a.benchmarks > 1 ? 's' : ''}`);
  } else if (r.type === 'dataset') {
    if (r.size_category) m.push(r.size_category.replace('n<', '< ').replace('<n<', ' to ').replace('K', 'K rows').replace('M', 'M rows'));
    if (lic) m.push(lic);
    const langs = Array.isArray(r.languages?.value) ? r.languages.value : [];
    if (langs.length && !(langs.length === 1 && langs[0] === 'en')) m.push(langs.length > 3 ? `${langs.length} languages` : langs.map(langName).join(', '));
    if (r.paper_urls?.length) m.push('has a paper');
  } else {
    if (r.categories?.length) m.push(r.categories.slice(0, 3).join(', '));
    if (r.type === 'host' && Array.isArray(r.data_centers?.value)) { const cs = [...new Set(r.data_centers.value.map((d) => d.country))]; if (cs.length) m.push(`data centers ${cs.map(flag).join(' ')}`); }
    if (r.official_store?.rating) m.push(`⭐ ${r.official_store.rating} on the App Store`);
  }
  const nv = Array.isArray(r.variants) ? r.variants.length : r.variants; if (nv) m.push(`+${nv} other version${nv > 1 ? 's' : ''}`);
  const nc = Array.isArray(r.copies) ? r.copies.length : r.copies; if (nc) m.push(`+${nc} community version${nc > 1 ? 's' : ''}`);
  if (r.copy_of) m.push(`community version of ${typeof r.copy_of === 'object' ? r.copy_of.name : 'a listed model'}`);
  return m.length ? `<p class="meta">${m.map(esc).join('<span class="sep"> · </span>')}</p>` : '';
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
const PERIOD = { month: '/ month', year: '/ year', once: 'once', hour: '/ hour', million_tokens: 'per million tokens', credit_pack: 'credit pack' };
export function priceLine(a) {
  const ps = a?.prices || [];
  if (!ps.length) return '';
  const money = (p) => { try { return new Intl.NumberFormat('en', { style: 'currency', currency: p.currency, maximumFractionDigits: 2 }).format(p.amount); } catch { return `${p.amount} ${p.currency}`; } };
  return `<p class="ln">💰 ${ps.slice(0, 4).map((p) => `<span class="it">${esc(p.plan)}: <strong>${esc(money(p))}</strong> ${esc(PERIOD[p.period] || '')}${p.country ? ` <span class="muted">(${esc(countryName(p.country))})</span>` : ''}${src(p)}</span>`).join('<span class="sep"> · </span>')}</p>`;
}
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

// ---- details: labelled facts (label: value), with jargon linked to the glossary ----
const row = (label, html, gl) => html ? `<div class="fr"><dt>${esc(label)}${gl ? ` <a class="gl" href="${esc(view.base)}glossary/#${gl}" title="What does this mean?" aria-label="What does ${esc(label.toLowerCase())} mean?">?</a>` : ''}</dt><dd>${html}</dd></div>` : '';
export function factsTable(r) {
  const a = r.answers || {}; const rows = []; const unknown = [];
  const f = (label, c, fmt = (v) => esc(v), gl) => { if (c === undefined) return; const v = claimVal(c, fmt); if (!v) { unknown.push(label.toLowerCase()); return; } rows.push(row(label, v, gl)); };
  if (a.good_for?.length) rows.push(row('Good for', esc(a.good_for.map((c) => CAPS[c] || c).join(' · '))));
  const isFree = ['free_download', 'free', 'free_tier', 'trial'].includes(a.free);
  const lic = r.license && known(r.license) ? `${licText(r.license.value)}${a.license_kind === 'open' ? ` · ${ok} commercial use` : a.license_kind === 'non_commercial' ? ` · ${bad} no commercial use` : ''}${src(r.license)}` : null;
  if (r.type === 'model' || r.type === 'dataset') {
    const sizes = (r.distributions || []).map((d) => d.file_size_bytes).filter(Boolean).sort((x, y) => x - y);
    if (r.type === 'model') rows.push(row('Run it yourself', a.runs_locally ? `${ok} yes${r.local_runtimes?.length ? ` <span class="muted">with ${esc(r.local_runtimes.join(', '))}</span>` : ''}${sizes.length ? ` · download from ${gb(sizes[0])}` : ''}` : `${bad} no version to run yourself`, 'local'));
    else if (sizes.length) rows.push(row('Download', `from ${gb(sizes[0])}`));
    rows.push(row('Cost', isFree ? `${ok} ${esc(FREE_TEXT[a.free])}` : a.free === 'paid' ? `${bad} paid` : unknownTxt, 'free-tier'));
    rows.push(row('Sign-in', a.gate && a.gate !== 'none' ? `🔒 ${esc(GATE_TEXT[a.gate] || a.gate)}` : `${ok} no sign-in needed`));
    rows.push(row('License', lic || unknownTxt, 'open-weights'));
  }
  if (r.platforms) {
    const parts = Object.keys(PLATFORMS).filter((p) => r.platforms[p]).map((p) => `<span title="${esc(`${PLATFORMS[p][1]} via ${r.platforms[p].map(viaName).join(', ')}`)}">${PLATFORMS[p][0]} ${PLATFORMS[p][1]}</span>`);
    const via = [...new Set(Object.values(r.platforms).flat())].filter((v) => view.runtimes?.[v]);
    rows.push(row('Runs on', `${parts.join('<span class="sep"> · </span>')}${via.length ? ` <span class="muted">via ${via.map((v) => `<a href="${esc(view.runtimes[v].docs)}" rel="noopener" target="_blank">${esc(view.runtimes[v].name)}</a>`).join(', ')}</span>` : ''}`));
  }
  if (r.hardware) {
    const o = r.hardware.options; const rec = o[0].recommended_gb || o[0].memory_gb;
    rows.push(row('Memory', `needs ~${o[0].memory_gb} GB${fitMark(o[0].memory_gb)} · <strong>${rec} GB recommended</strong> <span class="muted">(${esc(deviceShort(rec))})</span>`, 'memory'));
    if (o.length > 1) rows.push(row('Sizes', o.map((x) => `<span class="chip" title="${x.download_gb ? `${x.download_gb} GB download · ` : ''}needs ~${x.memory_gb} GB">${esc(x.label)} → ${x.recommended_gb || x.memory_gb} GB${fitMark(x.memory_gb)}</span>`).join(' '), 'bit'));
    rows.push(row('Good to know', `A processor alone works, slowly · a graphics card is fast if it fits · on a Mac the memory is shared${r.hardware.moe ? ' · MoE: faster than its size' : ''} <span class="muted">(estimates)</span>`));
  }
  if (r.type === 'model') {
    const bm = r.benchmarks || []; const ind = r.independent_benchmarks || [];
    const indChip = (x) => `<a class="chip" href="${esc(x.url)}" rel="noopener" target="_blank" title="${esc(`${x.source}${x.detail ? ' · ' + x.detail : ''} · checked ${fmtDate(x.observed_at)}`)}">${esc(x.label.replace('Epoch Capabilities Index', 'Epoch index').replace('AA Intelligence Index', 'AA index'))} <strong>${esc(x.display)}</strong></a>`;
    const more = [a.good_for?.includes('chat') && '<a href="https://lmarena.ai/leaderboard" rel="noopener" target="_blank">LMArena ↗</a>', a.good_for?.includes('search') && '<a href="https://huggingface.co/spaces/mteb/leaderboard" rel="noopener" target="_blank">MTEB ↗</a>'].filter(Boolean).join(' · ');
    rows.push(row('How smart', [ind.length && `${ind.map(indChip).join(' ')} <span class="muted">independent</span>`, bm.length && `${bm.slice(0, 4).map((x) => `<span class="chip">${esc(x.benchmark)} <strong>${esc(typeof x.value === 'number' ? +x.value.toFixed(1) : x.value)}</strong></span>`).join(' ')} <span class="muted">self-reported</span>`, !ind.length && !bm.length && '<span class="unknown">no benchmark results yet</span>', more && `<span class="muted">leaderboards:</span> ${more}`].filter(Boolean).join(' · '), 'benchmark'));
    const ctx = r.ollama?.context || r.distributions?.find((d) => d.context)?.context;
    if (ctx) rows.push(row('Context', `${esc(ctx)} tokens <span class="muted">(how much text it can take in at once)</span>`, 'tokens'));
    const feats = [a.good_for?.includes('reasoning') && '🧠 thinks step by step', a.good_for?.includes('tools') && '🛠️ uses tools', a.good_for?.includes('vision') && '👁️ sees images', r.hardware?.moe && '⚡ MoE'].filter(Boolean);
    if (feats.length) rows.push(row('Features', feats.join(' · ')));
    const langs = Array.isArray(r.languages?.value) ? r.languages.value : [];
    if (langs.length) rows.push(row('Languages', `<span title="${esc(langs.map(langName).join(', '))}">${esc(langs.length > 6 ? `${langs.length} languages` : langs.map(langName).join(', '))}</span>${src(r.languages)}`));
    else unknown.push('languages');
  }
  if (a.uncensored || a.barriers?.length) rows.push(row('Watch out', [a.uncensored && '✂️ <strong>uncensored</strong>: changed to refuse fewer requests', ...(a.barriers || []).map((x) => `🚧 ${esc(x)}`)].filter(Boolean).join(' · '), a.uncensored ? 'uncensored' : null));
  f('Publisher country', r.publisher_region, (v) => `${flag(v)} ${esc(countryName(v))}`);
  if (r.type === 'model') {
    f('Release date', r.released_at);
    if (r.first_published && known(r.first_published)) rows.push(row('First on Hugging Face', claimVal(r.first_published)));
    f('Parameters', r.parameters, undefined, 'params');
  }
  if (r.type === 'dataset') { if (r.size_category) rows.push(row('Rows', esc(r.size_category))); if (r.formats?.length) rows.push(row('Formats', esc(r.formats.join(', ')))); f('Languages', r.languages, (v) => Array.isArray(v) ? esc(v.length > 6 ? `${v.length} languages` : v.map(langName).join(', ')) : esc(v)); }
  if (r.type === 'app') { if (r.categories?.length) rows.push(row('Category', esc(r.categories.join(', ')))); f('Interface languages', r.interface_languages, (v) => Array.isArray(v) ? esc(v.length > 6 ? `${v.length} languages` : v.map(langName).join(', ')) : esc(v)); }
  if (r.type === 'host') { if (r.kinds?.length) rows.push(row('Offers', esc(r.kinds.map((k) => KIND_LABELS[k] || k).join(', ')))); f('Data centers', r.data_centers, (v) => v.map((d) => `<span title="${esc(d.city_or_region || '')}">${flag(d.country)} ${esc(countryName(d.country))}</span>`).join(', ')); f('GPUs', r.gpu_types, (v) => Array.isArray(v) ? esc(v.join(', ')) : esc(v)); f('Data residency', r.data_residency, (v) => esc(String(v))); }
  if (r.type === 'model' && r.relations?.length) {
    const REL = { uncensored_variant_of: 'uncensored variant of', finetune_of: 'fine-tune of', adapter_of: 'adapter for', merge_of: 'merge of', quantization_of: 'quantization of', variant_of: 'variant of', successor_of: 'successor of' };
    const to = (x, label) => x.listing ? `<a href="${esc(view.base + x.listing)}">${esc(x.name || label)}</a>` : x.url ? `<a href="${esc(x.url)}" rel="noopener" target="_blank">${esc(label)}</a>` : esc(label);
    rows.push(row('Made from', r.relations.slice(0, 2).map((x) => { const t = String(x.target || x.target_id || x.id || ''); const label = t.replace('https://huggingface.co/', '').split('/').slice(t.startsWith('cf:') ? -1 : 0).join('/') || '?'; return `${esc(REL[x.type] || x.type || 'related to')} ${x.listing || x.url ? to(x, label) : /^https?:/.test(t) ? `<a href="${esc(t)}" rel="noopener" target="_blank">${esc(label)}</a>` : esc(label)}`; }).join('; ')));
    const direct = new Set((r.origin?.parents || []).map((p) => p.hf_id));
    const up = (r.origin?.originals || []).filter((o) => !direct.has(o.hf_id));
    if (up.length) rows.push(row('🌱 Original', `${up.map((o) => `${to(o, o.hf_id)}${o.chain.length > 2 ? ` <span class="muted">(${o.chain.length - 1} steps up)</span>` : ''}`).join(', ')} <span class="muted" title="${esc(`Traced through ${r.origin.source}${up.some((o) => !o.complete) ? '; the chain stops where a model page couldn\'t be read' : ''}`)}">ⓘ</span>`));
  }
  const dv = r.discovered_via;
  const found = dv?.source === 'x' ? `spotted on X ${esc(fmtDate(dv.created_at))} <a href="${esc(dv.url)}" rel="noopener" target="_blank">post ↗</a>` : dv?.source === 'huggingface-new' ? `new on Hugging Face ${esc(fmtDate(dv.created_at))}${dv.why === 'trending' ? ', trending' : ''}` : dv?.source === 'youtube' ? `in a ${esc(dv.author || '')} video ${esc(fmtDate(dv.created_at))} <a href="${esc(dv.url)}" rel="noopener" target="_blank">watch ↗</a>` : dv?.source === 'llm-releases' ? `listed on <a href="${esc(dv.url)}" rel="noopener" target="_blank">llm-releases.com</a>` : dv?.source === 'replicate' ? `new on <a href="${esc(dv.url)}" rel="noopener" target="_blank">Replicate</a>`
    : dv?.source === 'openrouter' ? `new on <a href="${esc(dv.url)}" rel="noopener" target="_blank">OpenRouter</a> ${esc(fmtDate(dv.created_at))}`
    : dv?.source === 'maker-blog' ? `in ${esc(dv.author || 'its maker')}'s news ${esc(fmtDate(dv.created_at))} <a href="${esc(dv.url)}" rel="noopener" target="_blank">read ↗</a>`
    : dv?.source === 'hf-papers' ? `with a paper on Hugging Face <a href="${esc(dv.url)}" rel="noopener" target="_blank">read ↗</a>`
    : dv?.source === 'hackernews' ? `on Hacker News ${esc(fmtDate(dv.created_at))} <a href="${esc(dv.url)}" rel="noopener" target="_blank">discussion ↗</a>`
    : dv?.source === 'bluesky' ? `on Bluesky ${esc(fmtDate(dv.created_at))} <a href="${esc(dv.url)}" rel="noopener" target="_blank">post ↗</a>`
    : dv?.source === 'app-store' ? `researched automatically from the <a href="${esc(dv.url)}" rel="noopener" target="_blank">App Store</a>`
    : dv?.source === 'product-hunt' ? `researched automatically after its <a href="${esc(dv.url)}" rel="noopener" target="_blank">Product Hunt launch</a>`
    : dv?.source === 'ollama-new' ? `new in the <a href="${esc(dv.url)}" rel="noopener" target="_blank">Ollama library</a>` : '';
  if (found) rows.push(row('Found', found));
  return `<h3 class="dh">📋 The facts</h3><dl class="facts">${rows.join('')}</dl>${unknown.length ? `<p class="ln muted">❓ Not stated anywhere we checked: ${esc(unknown.join(', '))}</p>` : ''}`;
}

// ---- "Using it in [country]": availability, free plan, every way to pay with its note written out, sign-up, prices ----
export function usingBox(r, a = r.access, what = 'it') {
  if (!a) return '';
  const c = view.country; const cn = c ? countryName(c) : '';
  const opts = [...countryNames.entries()].sort((x, y) => x[1].localeCompare(y[1])).map(([k, n]) => `<option value="${esc(k)}"${k === c ? ' selected' : ''}>${flag(k)} ${esc(n)}</option>`).join('');
  const where = view.base ? `<select class="use-country" aria-label="Your country"><option value="">your country…</option>${opts}</select>` : c ? `${flag(c)} ${esc(cn)}` : 'your country';
  const rows = [];
  const av = a.countries_available?.value; const un = a.countries_unavailable?.value;
  const general = av === 'all_except_listed' ? `most countries${Array.isArray(un) && un.length ? `, except ${countryList(un)}` : ''}` : Array.isArray(av) ? (av.length > 8 ? `${av.length} countries` : countryList(av)) : null;
  if (c) { const s = availableIn(a, c); rows.push(row('Available', `${s === 'yes' ? `${ok} yes, in ${esc(cn)}` : s === 'no' ? `${bad} not in ${esc(cn)}` : `<span class="unknown">not stated for ${esc(cn)}</span>`}${general ? ` <span class="muted">· ${general}</span>` : ''}${src(a.countries_available)}`)); }
  else rows.push(row('Available', general ? `${general}${src(a.countries_available)}` : `<span class="unknown">not stated</span>${view.base ? '' : ' · <span class="muted">choose your country above</span>'}`));
  if (known(a.free)) rows.push(row('Free plan', `${a.free.value === 'paid_only' ? bad : ok} ${esc(FREE_LABELS[a.free.value] || a.free.value)}${a.free_limits ? ` <span class="muted">· ${esc(a.free_limits)}</span>` : ''}${src(a.free)}`, 'free-tier'));
  const pm = methodsOf(a);
  if (pm.length) {
    const here = (m) => methodFor(m, c);
    const sorted = [...pm].sort((x, y) => (here(y) - here(x)) || (CARDS.includes(x.method) - CARDS.includes(y.method)));
    const noCardHere = pm.some((m) => !CARDS.includes(m.method) && here(m));
    rows.push(row('Ways to pay', `<ul class="pay">${sorted.map((m) => `<li${here(m) ? '' : ' class="elsewhere"'}>${CARDS.includes(m.method) ? '💳' : here(m) ? ok : '·'} <strong>${esc(METHOD_LABELS[m.method] || m.method)}</strong>${m.note ? ` <span class="muted">· ${esc(m.note)}</span>` : ''}${here(m) ? '' : ` <span class="muted">(not for ${esc(cn)})</span>`}</li>`).join('')}</ul>${noCardHere ? `<span class="yes">✓ You can pay without a card${c ? ` in ${esc(cn)}` : ''}</span>` : payNoCard(a) && c ? `<span class="muted">The card-free ways listed are for other countries</span>` : '<span class="muted">Paid plans take cards only</span>'}${src(a.payment_methods)}`, 'no-card'));
  } else rows.push(row('Ways to pay', unknownTxt));
  if (known(a.signup_requirements)) rows.push(row('Sign-up', `${esc(a.signup_requirements.value)}${src(a.signup_requirements)}`));
  if (known(a.local_currency_pricing)) rows.push(row('Prices', `${a.local_currency_pricing.value ? `${ok} in local currency` : 'in US dollars or euros'}${src(a.local_currency_pricing)}`));
  return `<section class="using"><h3 class="dh">🌍 Using ${esc(what)} in ${where}</h3><dl class="facts">${rows.join('')}</dl>${r.access === a ? playLine(r) + priceLine(a) : ''}</section>`;
}

// Re-renders the listing on its own page with the visitor's choices (device, country, language) from this browser.
export function listingInner(r) {
  const region = known(r.publisher_region) ? ` ${flag(r.publisher_region.value)}` : '';
  return `<div class="card-head"><h1>${esc(r.name)}</h1><span class="pub">${esc(r.publisher_name || r.publisher)}${region}</span></div>
    <p class="desc">${esc(plainWhat(r))}</p>${plainWhat(r) !== r.description ? `<p class="desc-src muted">${esc(r.description)}</p>` : ''}
    ${verdictStrip(r)}
    <div class="badges">${cardBadges(r)}</div>
    ${metaLine(r)}
    ${detail(r)}`;
}

export function detail(r) {
  let h = '<div class="detail">';
  h += shareRow(r);
  h += view.base ? `<div id="start">${startBlock(r)}</div>` : startBlock(r); // an anchor on listing pages ("How to start →" links here)
  if (r.type === 'app' || r.type === 'host') h += usingBox(r);
  if (r.type === 'model') for (const d of (r.distributions || []).filter((x) => x.access)) h += usingBox(r, d.access, `the ${SOURCE_LABELS[d.source] || d.source}`);
  h += onlineLine(r);
  h += newsLine(r);
  h += factsTable(r);
  h += similarLine(r);
  if (!view.base) { h += xLine(r); h += ytLine(r); } // listing pages show these in their side panels
  h += accessCheckLine(r);
  if (r.possibly_discontinued) h += `<p class="ln warn-ln">⚠️ Possibly discontinued: ${esc(r.possibly_discontinued.reason)}. Check the official site before using or paying.</p>`;
  const short = (u) => { try { const x = new URL(u); return x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/$/, ''); } catch { return u; } };
  const mid = (t, n = 52) => t.length <= n ? t : `${t.slice(0, Math.ceil(n * 0.45))}…${t.slice(-Math.floor(n * 0.5))}`;
  const linkList = (urls, max = 4) => urls.slice(0, max).map((u) => `<a href="${esc(u)}" rel="noopener" target="_blank" title="${esc(u)}">${esc(mid(short(u)))}</a>`).join(' · ') + (urls.length > max ? ` <span class="muted">+${urls.length - max}</span>` : '');
  const links = [...new Set([r.url, r.launch_url, ...(r.official_urls || []), ...(r.app_store_urls || [])].filter(Boolean))];
  const lrows = [];
  if (r.type === 'model') lrows.push(row('Get it from', (r.distributions || []).map((d) => `<a href="${esc(d.url)}" rel="noopener" target="_blank" title="${esc((AVAIL_LABELS[d.availability] || '') + (d.formats?.length ? ' · ' + d.formats.join(', ') : '') + (d.file_size_bytes ? ' · ' + gb(d.file_size_bytes) : ''))}">${esc(SOURCE_LABELS[d.source] || d.source)}${d.source === 'ollama' ? ' ' + esc(String(d.native_id).split(':')[1] || '') : ''}</a>`).join(' · ')));
  if (links.length) lrows.push(row('Official', linkList(links, 3)));
  if (r.documentation_urls?.length) lrows.push(row('Docs', linkList(r.documentation_urls, 3)));
  if (r.paper_urls?.length) lrows.push(row('Papers', r.paper_urls.slice(0, 4).map((u, i) => `<a href="${esc(u)}" rel="noopener" target="_blank">paper${r.paper_urls.length > 1 ? ' ' + (i + 1) : ''}</a>`).join(' · ')));
  if (r.variants?.length) lrows.push(row('Other versions', `${r.variants.slice(0, 6).map((v) => `<a href="${esc(v.url)}" rel="noopener" target="_blank" title="${esc(v.kind)}${v.downloads_30d ? ' · ↓ ' + fmtNum(v.downloads_30d) + ' a month' : ''}">${esc(v.name)}</a>${v.publisher !== r.publisher ? ` <span class="muted">by ${esc(v.publisher)}</span>` : ''}`).join(' · ')}${r.variants.length > 6 ? ` <span class="muted">+${r.variants.length - 6}</span>` : ''}`));
  if (Array.isArray(r.copies) && r.copies.length) lrows.push(row('Community versions', `${r.copies.slice(0, 8).map((c) => `<a href="${esc(view.base + c.path)}">${esc(c.name)}</a> <span class="muted">by ${esc(c.publisher)}</span>`).join(' · ')}${r.copies.length > 8 ? ` <span class="muted">+${r.copies.length - 8}</span>` : ''}`));
  if (lrows.length) h += `<h3 class="dh">🔗 Links</h3><dl class="facts">${lrows.join('')}</dl>`;
  h += `<p class="ln src">${r.verification_status === 'verified' ? (r.verified_by ? `✅ Verified (${esc(r.verified_by)})` : '✅ Verified at an official source') : '⚠️ Not yet verified: treat facts with care'} · first seen ${esc(fmtDate(r.first_seen_at))} · ${r.evidence_urls?.length || 0} sources</p>`;
  return h + '</div>';
}
// How well a listing suits the visitor's choices (device memory, country): 0 best, 1 unknown, 2 doesn't.
// Used to sort listings and highlight the best ones. Without choices, everything is 1.
export function suits(r) {
  let s = 1; let any = false;
  if (view.mem && r.type === 'model') {
    any = true;
    const need = r.hardware?.min_memory_gb;
    s = !need ? 1 : need <= view.mem * 0.8 ? 0 : need <= view.mem ? 1 : 2;
  }
  if (view.country && (r.type === 'app' || r.type === 'host' || (r.distributions || []).some((d) => d.access))) {
    any = true;
    const acc = r.access ? [r.access] : (r.distributions || []).map((d) => d.access).filter(Boolean);
    const av = acc.map((a) => availableIn(a, view.country));
    const dcHere = r.type === 'host' && Array.isArray(r.data_centers?.value) && r.data_centers.value.some((d) => d.country === view.country);
    const c = av.includes('no') && !av.includes('yes') ? 2 : (av.includes('yes') || dcHere) ? 0 : 1;
    const pay = acc.some((a) => payNoCard(a, view.country) || ['free', 'free_tier'].includes(a.free?.value)) || playNoCard(r, view.country).length ? 0 : 1;
    const countryScore = c === 2 ? 2 : c === 0 && pay === 0 ? 0 : 1; // available there and payable without a card (or free)
    s = Math.max(view.mem && r.type === 'model' ? s : 0, countryScore);
  }
  return any ? s : 1;
}
export function card(r) {
  const region = known(r.publisher_region) ? ` ${flag(r.publisher_region.value)}` : '';
  return `<li class="card${suits(r) === 0 && (view.mem || view.country) ? ' best' : ''}${(r.type === 'app' || r.type === 'host') && r.verification_status !== 'verified' ? ' candidate' : ''}" id="${esc(r.id.replace(/[:/]/g, '-'))}"><details><summary>
    <div class="card-head"><h2>${esc(r.name)}</h2><span class="pub">${esc(r.publisher_name || r.publisher)}${region}</span></div>
    <p class="desc">${esc(plainWhat(r))}</p>
    ${verdictStrip(r)}
    <div class="badges">${cardBadges(r)}</div>
    ${metaLine(r)}
    <div class="more">Open details ▾</div>
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
// A live YouTube search for the listing, newest uploads first (like "Reactions on X"; no API quota used).
export function ytSearchUrl(r) {
  const name = r.name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const q = name.length <= 3 ? `${name} ${r.publisher_name || r.publisher}` : `${/\s/.test(name) ? `"${name}"` : name}${r.type === 'host' ? ' GPU' : r.type === 'dataset' ? ' dataset' : ' AI'}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=CAI%253D`;
}
// The action row: Save and Compare, then Share ▾ and More ▾ menus (one row instead of nine buttons).
export function shareRow(r) {
  const url = listingUrl(r);
  const text = `${r.name} on CleverFox: ${(r.answers?.good_for || []).slice(0, 3).map((c) => (CAPS[c] || c).replace(/^\S+\s/, '')).join(', ') || r.description}`;
  return `<div class="share actions" data-url="${esc(url)}" data-title="${esc(r.name)}" data-text="${esc(text)}">
    <button type="button" class="share-btn save-btn" data-act="save" data-save="${esc(r.id)}" aria-pressed="false" hidden>☆ Save</button>
    <button type="button" class="share-btn compare-btn" data-compare="${esc(r.id)}" hidden>⚖️ Compare</button>
    <details class="menu"><summary class="share-btn">📤 Share ▾</summary><div class="menu-list">
      <button type="button" class="share-btn" data-act="copy">📋 Copy link</button>
      <button type="button" class="share-btn" data-act="share" hidden>📤 Share…</button>
      <a class="share-btn" href="https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener">𝕏 Post</a>
      <a class="share-btn" href="https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}" target="_blank" rel="noopener">💬 WhatsApp</a>
    </div></details>
    <details class="menu"><summary class="share-btn">More ▾</summary><div class="menu-list">
      ${view.base ? '' : `<a class="share-btn" href="${esc(view.base + listingPath(r))}">🔗 Its own page</a>`}
      <a class="share-btn" href="${esc(xSearchUrl(r))}" target="_blank" rel="noopener">👀 Reactions on X</a>
      <a class="share-btn" href="${esc(ytSearchUrl(r))}" target="_blank" rel="noopener">▶️ Videos on YouTube</a>
    </div></details>
  </div>`;
}
// Browser only: makes the share buttons work (copy, the phone's share menu), and plays a YouTube video when asked.
export function wireShare(root) {
  if (navigator.share) root.querySelectorAll?.('[data-act="share"]').forEach((b) => { b.hidden = false; });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest?.('[data-act]'); if (!b) return;
    if (b.dataset.act === 'yt-play') {
      // Nothing loads from YouTube until the visitor presses play (privacy-enhanced mode, youtube-nocookie.com).
      const f = Object.assign(document.createElement('iframe'), { src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.yt)}?autoplay=1`, title: b.dataset.title || 'YouTube video', allow: 'autoplay; encrypted-media; picture-in-picture', allowFullscreen: true, loading: 'lazy' });
      f.className = 'yt-frame'; b.replaceWith(f);
      return;
    }
    const box = b.closest('.share');
    if (b.dataset.act === 'copy-cmd') {
      try { await navigator.clipboard.writeText(b.dataset.text); b.textContent = '✓ Copied'; } catch { prompt('Copy this command:', b.dataset.text); }
      setTimeout(() => { b.textContent = '📋 Copy'; }, 2000);
      return;
    }
    if (b.dataset.act === 'copy') {
      try { await navigator.clipboard.writeText(box.dataset.url); b.textContent = '✓ Copied'; } catch { prompt('Copy this link:', box.dataset.url); }
      setTimeout(() => { b.textContent = '📋 Copy link'; }, 2000);
    } else if (b.dataset.act === 'share') {
      try { await navigator.share({ title: box.dataset.title, text: box.dataset.text, url: box.dataset.url }); } catch { /* cancelled */ }
    }
  });
}

// ---- what people say on X ----
const fmtK = (n) => n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : String(n || 0);
export function xLine(r) {
  const b = r.x_buzz;
  if (!b) return '';
  return line([item('📣', `<strong>On X:</strong> 👍 ${b.positive ?? b.praise_posts ?? 0} · 👎 ${b.critical ?? 0} · 💬 ${b.general ?? 0} <span class="muted">of ${b.posts} recent posts · ❤️ ${fmtK(b.total_likes ?? b.likes)} · checked ${esc(fmtDate(b.observed_at))}</span>`), `<span class="it"><a href="${esc(view.base + listingPath(r))}#x">see the posts →</a></span>`]);
}
// Side panel for a listing's own page: top posts by tone, shown with X's own embeds (links only stored).
export function xPanel(r) {
  const b = r.x_buzz;
  const live = `<a href="${esc(xSearchUrl(r))}" rel="noopener" target="_blank">👀 Latest posts on X ↗</a>`;
  if (!b || !b.posts) return `<aside class="xside" id="x"><h2>What people say on X</h2><p class="muted">No posts collected yet. X scanning collects the most-liked posts about each listing once it's switched on.</p><p>${live}</p></aside>`;
  // Little signal (no likes, no clear praise or criticism): say so plainly instead of a row of zeros.
  if (!(b.total_likes ?? b.likes) && !b.positive && !b.critical) return `<aside class="xside" id="x"><h2>What people say on X</h2><p class="muted">Not much talk on X yet: ${b.posts} recent post${b.posts > 1 ? 's' : ''}, none with likes (checked ${esc(fmtDate(b.observed_at))}).</p><p>${live}</p></aside>`;
  const embed = (p) => `<blockquote class="twitter-tweet" data-dnt="true" data-conversation="none"><a href="${esc(p.url)}">Post by @${esc(p.author)} · ❤️ ${fmtK(p.likes)} · ${esc(fmtDate(p.created_at))}</a></blockquote>`;
  const group = (title, list) => list?.length ? `<h3>${title}</h3>${list.map(embed).join('')}` : '';
  const total = Math.max(1, b.posts);
  const bar = `<div class="tonebar" title="${b.positive} positive, ${b.critical} critical, ${b.general} general"><span class="t-pos" style="width:${(100 * (b.positive || 0) / total).toFixed(0)}%"></span><span class="t-crit" style="width:${(100 * (b.critical || 0) / total).toFixed(0)}%"></span></div>`;
  const shown = new Set();
  const uniq = (list) => (list || []).filter((p) => !shown.has(p.url) && shown.add(p.url));
  return `<aside class="xside" id="x"><h2>What people say on X</h2>
    <p class="ln">👍 <strong>${b.positive || 0}</strong> positive · 👎 <strong>${b.critical || 0}</strong> critical · 💬 <strong>${b.general || 0}</strong> general <span class="muted">of ${b.posts} recent posts</span></p>${bar}
    <p class="ln muted">❤️ ${fmtK(b.total_likes ?? b.likes)} likes · checked ${esc(fmtDate(b.observed_at))}${b.praised ? ' · 📣 praised by several accounts' : ''}</p>
    <p><button type="button" id="x-load" class="share-btn">▶ Show the posts <span class="muted">(loads content from X)</span></button></p>
    ${group('⭐ Most liked', uniq(b.top?.all))}${group('👍 Positive', uniq(b.top?.positive))}${group('👎 Critical', uniq(b.top?.critical))}${group('💬 General', uniq(b.top?.general))}
    <p class="muted src">Tone is sorted by simple word rules, so treat it as a rough guide. ${live}</p></aside>`;
}

// "What people show on YouTube": reviews found by searching "<name> review", and videos from makers' channels
// and release searches that name the listing. Links first; a video plays in the page only when pressed.
export const ytReviewUrl = (r) => { const name = r.name.replace(/\s*\(.*?\)\s*/g, ' ').trim(); return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${/\s/.test(name) ? `"${name}"` : name}${name.length <= 4 ? ` ${r.publisher_name || r.publisher}` : ''} review`)}`; };
const ytId = (v) => v.id || String(v.url || '').match(/[?&]v=([\w-]{11})/)?.[1];
export function ytPanel(r) {
  if (r.type === 'dataset') return '';
  const reviews = r.yt_reviews?.videos || [];
  const shown = new Set(reviews.map(ytId));
  const more = (r.yt_videos || []).filter((v) => !shown.has(ytId(v)));
  const links = `<a href="${esc(ytReviewUrl(r))}" rel="noopener" target="_blank">▶️ Reviews on YouTube ↗</a> · <a href="${esc(ytSearchUrl(r))}" rel="noopener" target="_blank">Latest videos ↗</a>`;
  if (!reviews.length && !more.length) return `<aside class="xside ytside" id="yt"><h2>What people show on YouTube</h2><p class="muted">${r.yt_reviews ? `No review videos found when we last looked (${esc(fmtDate(r.yt_reviews.checked_at))}).` : 'No videos collected yet. CleverFox looks for reviews of a few listings on YouTube each scan.'}</p><p>${links}</p></aside>`;
  const vid = (v) => { const id = ytId(v); return `<li class="yt-item"><a href="${esc(v.url)}" rel="noopener" target="_blank">${esc(v.title)}</a> <span class="muted">${esc(v.channel || '')}${v.official ? ' · official' : ''} · ${esc(fmtDate(v.published_at))}</span>${id ? `<br><button type="button" class="share-btn yt-play" data-act="yt-play" data-yt="${esc(id)}" data-title="${esc(v.title)}">▶ Play here</button>` : ''}</li>`; };
  return `<aside class="xside ytside" id="yt"><h2>What people show on YouTube</h2>
    ${reviews.length ? `<h3>🔎 Reviews and walkthroughs</h3><ul class="yt-list">${reviews.map(vid).join('')}</ul>` : ''}
    ${more.length ? `<h3>📢 From makers and release news</h3><ul class="yt-list">${more.map(vid).join('')}</ul>` : ''}
    <p class="muted src">Found by YouTube search${r.yt_reviews ? `, checked ${esc(fmtDate(r.yt_reviews.checked_at))}` : ''}; not reviewed by CleverFox. Videos load from YouTube only when you press play. ${links}</p></aside>`;
}

// How fresh the access facts are, and whether their source pages changed or broke since (tools/recheck.mjs).
export function accessCheckLine(r) {
  const c = r.access_check;
  if (!c) return '';
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const parts = [];
  if (c.facts_checked_at) parts.push(item('🗓️', `access facts checked ${esc(fmtDate(c.facts_checked_at))}${c.stale ? ' <strong>(over 6 months ago: check the official page)</strong>' : ''}`));
  if (c.checked_at) parts.push(item('🔄', `source pages re-checked ${esc(fmtDate(c.checked_at))}`));
  let h = line(parts);
  if (c.changed?.length) h += `<p class="ln warn-ln">⚠️ ${c.changed.map((x) => `<a href="${esc(x.url)}" rel="noopener" target="_blank">${esc(host(x.url))}</a>`).join(', ')} changed on ${esc(fmtDate(c.changed[0].changed_at))}, after these facts were checked: prices, payments or countries may be out of date.</p>`;
  const LBL = { free: 'free', ...Object.fromEntries(Object.entries(METHOD_LABELS)) };
  const conf = (c.facts || []).filter((f) => f.status === 'confirmed');
  const miss = (c.facts || []).filter((f) => f.status !== 'confirmed');
  if (conf.length) h += `<p class="ln muted">✅ Found on the source page${conf.length > 1 ? 's' : ''}: ${esc([...new Set(conf.flatMap((f) => f.found.map((x) => LBL[x] || x)))].join(', '))} <span class="muted">(checked automatically ${esc(fmtDate(conf[0].checked_at))})</span></p>`;
  if (miss.length) h += `<p class="ln muted">🔎 Not found on the source page, so not confirmed: ${esc([...new Set(miss.flatMap((f) => f.missing.map((x) => LBL[x] || x)))].join(', '))}. It may be on another page or behind a sign-in.</p>`;
  if (c.broken?.length) h += `<p class="ln warn-ln">🔗 Source link${c.broken.length > 1 ? 's' : ''} not loading: ${c.broken.map((x) => `<a href="${esc(x.url)}" rel="noopener" target="_blank">${esc(host(x.url))}</a>`).join(', ')}</p>`;
  return h;
}

// Use it online: API providers serving this model, free first, then cheapest. Prices per million tokens (input / output).
export function onlineLine(r) {
  const list = r.online || [];
  if (!list.length) return '';
  const money = (v) => v == null ? '' : v === 0 ? '$0' : `$${v < 0.1 ? v : v.toFixed(2)}`;
  const one = (p) => {
    const price = p.free ? '<strong class="yes">free</strong>' : (p.input != null || p.output != null) ? `${money(p.input)} / ${money(p.output)}` : '<span class="muted">price on site</span>';
    const pay = p.host_id ? ` <a class="src-i" href="${esc(view.base + 'l/host/' + p.host_id.replace('cf:host:', '') + '/')}" title="How to pay ${esc(p.name)}${p.no_card ? ': accepts a way to pay without a card' : ''}">${p.no_card ? '🪙' : 'ⓘ'}</a>` : '';
    return `<a href="${esc(p.url)}" rel="noopener" target="_blank">${esc(p.name)}</a> ${price}${pay}`;
  };
  const shown = list.slice(0, 5).map(one).join('<span class="sep"> · </span>');
  const src = list[0].source_url ? ` <a class="src-i" href="${esc(list[0].source_url)}" rel="noopener" target="_blank" title="Provider list from ${esc(list[0].source_url.includes('openrouter') ? 'OpenRouter' : list[0].source_url.includes('replicate') ? 'Replicate' : 'Hugging Face')}, ${esc(fmtDate(list[0].observed_at))}">ⓘ</a>` : '';
  return `<p class="ln">☁️ <strong>Use it online</strong> <span class="muted">(no GPU needed; $ per million tokens in / out, <a href="${esc(view.base)}glossary/#tokens">what's a token?</a>)</span>: ${shown}${list.length > 5 ? ` <span class="muted">+${list.length - 5} more</span>` : ''}${src}</p>`;
}

// ---- how to start: one step, for the visitor's device ----
export const BEGINNER_APPS = [['Ollama', 'https://ollama.com/download', 'Windows, macOS, Linux; one command per model'], ['LM Studio', 'https://lmstudio.ai/', 'Windows, macOS, Linux; point and click'], ['Jan', 'https://jan.ai/', 'Windows, macOS, Linux; open source, point and click']];
const storeLabel = (u) => /apps\.apple\.com/.test(u) ? '🍎 App Store' : /play\.google\.com/.test(u) ? '▶ Google Play' : /microsoft\.com|apps\.microsoft/.test(u) ? '🪟 Microsoft Store' : '⬇️ Download';
export function startBlock(r) {
  if (r.type === 'app') {
    const btns = [];
    if (r.url) btns.push(`<a class="share-btn" href="${esc(r.url)}" rel="noopener" target="_blank">🌐 Open on the web</a>`);
    for (const u of r.app_store_urls || []) btns.push(`<a class="share-btn" href="${esc(u)}" rel="noopener" target="_blank">${storeLabel(u)}</a>`);
    const off = r.official_store;
    const note = off ? `<p class="ln">✅ <strong>Official app</strong> by ${esc(off.seller)}${off.rating ? ` · ⭐ ${off.rating} from ${fmtNum(off.ratings)} ratings` : ''} <span class="muted">(App Store, checked ${esc(fmtDate(off.checked_at))})</span></p>` : '';
    const warn = r.lookalikes?.count ? `<p class="ln warn-ln">⚠️ ${r.lookalikes.count} other App Store apps use the name "${esc(r.lookalikes.brand)}" but aren't made by ${esc(off?.seller || r.publisher)}${r.lookalikes.examples?.length ? ` (for example ${r.lookalikes.examples.slice(0, 2).map((x) => `"${esc(x.name)}" by ${esc(x.seller)}`).join(', ')})` : ''}. Check the seller before you pay.</p>` : '';
    const cs = r.access?.app_store_countries;
    const where = cs ? `<p class="ln muted">🌍 In the App Store in ${cs.value.length} of ${cs.checked} countries checked${view.country ? (cs.value.includes(view.country) ? `, including ${esc(countryName(view.country))}` : cs.checked >= 150 ? `, not in ${esc(countryName(view.country))}` : '') : ''}.</p>` : '';
    return btns.length || note ? `<div class="start"><p class="ln">🚀 <strong>Start:</strong></p><div class="share">${btns.join('')}</div>${note}${where}${warn}</div>` : '';
  }
  if (r.type !== 'model' || !r.local_ready) return '';
  const opts = r.hardware?.options || [];
  const ollama = (r.distributions || []).filter((d) => d.source === 'ollama' && d.native_id && !/-mlx$/.test(d.native_id));
  const hf = (r.distributions || []).find((d) => d.source === 'huggingface');
  const cmds = [];
  if (ollama.length) {
    for (const d of ollama.slice(0, 4)) {
      const tag = String(d.native_id).split(':')[1] || '';
      const o = opts.find((x) => x.label === tag) || opts.find((x) => x.label.toLowerCase().startsWith(tag.toLowerCase()));
      cmds.push({ cmd: `ollama run ${d.native_id}`, need: o?.memory_gb ?? (d.file_size_bytes ? +(d.file_size_bytes / 1e9 * 1.2 + 0.5).toFixed(1) : null) });
    }
  } else if (hf && (hf.formats || []).includes('gguf')) {
    cmds.push({ cmd: `ollama run hf.co/${hf.native_id}`, need: r.hardware?.min_memory_gb ?? null });
  }
  // Pick the biggest size that fits comfortably in the visitor's memory; otherwise the smallest.
  const fits = (n) => view.mem && n != null && n <= view.mem * 0.8;
  const best = cmds.filter((c) => fits(c.need)).sort((a, b) => b.need - a.need)[0] || [...cmds].sort((a, b) => (a.need ?? 1e9) - (b.need ?? 1e9))[0];
  let h = '<div class="start"><p class="ln">🚀 <strong>Run it on your computer:</strong> ';
  if (best) {
    h += `install <a href="https://ollama.com/download" rel="noopener" target="_blank">Ollama</a>, then run:</p>`;
    h += cmds.map((c) => `<p class="ln cmd-ln"><code class="cmd">${esc(c.cmd)}</code> <button class="share-btn copy-btn" type="button" data-act="copy-cmd" data-text="${esc(c.cmd)}">📋 Copy</button> <span class="muted">${c.need != null ? `needs ~${c.need} GB` : ''}${c === best && view.mem ? (fits(c.need) ? ` · ✓ best fit for your ${view.mem} GB` : ` · smallest size; more than your ${view.mem} GB`) : ''}</span></p>`).join('');
    h += `<p class="ln muted">Prefer clicking to typing? ${BEGINNER_APPS.slice(1).map(([n, u, t]) => `<a href="${esc(u)}" rel="noopener" target="_blank" title="${esc(t)}">${n}</a>`).join(' or ')}${hf ? `, then search for <code>${esc(hf.native_id)}</code>` : ''}.</p>`;
  } else {
    h += `use a beginner app: ${BEGINNER_APPS.map(([n, u, t]) => `<a href="${esc(u)}" rel="noopener" target="_blank" title="${esc(t)}">${n}</a>`).join(', ')}${hf ? `, and search for <code>${esc(hf.native_id)}</code>` : ''}.</p>`;
  }
  return h + '</div>';
}

// Does this listing work in the visitor's language? Models: languages it handles; apps: interface languages.
export function speaks(r, lang) {
  if (!lang) return null;
  const v = r.type === 'app' ? r.interface_languages?.value : r.languages?.value;
  return Array.isArray(v) ? v.includes(lang) : null;
}

// ---- paying through Google Play (data/store-payments.json, from Google Play Help) ----
// An app sold through Google Play: it has a Google Play link and paid plans (store billing, a free tier, a trial or paid only).
export function soldOnPlay(r) {
  if (r.type !== 'app' || !(r.app_store_urls || []).some((u) => /play\.google\.com/.test(u))) return false;
  return methodsOf(r.access).some((m) => m.method === 'app_store_billing') || ['free_tier', 'trial', 'paid_only'].includes(r.access?.free?.value);
}
// Non-card ways Google Play accepts in that country, for an app sold there: [{method, note}].
export function playNoCard(r, country) {
  const t = view.storePayments?.google_play;
  if (!country || !t || !soldOnPlay(r)) return [];
  return (t.countries[country] || []).filter(([m]) => !CARDS.includes(m)).map(([method, note]) => ({ method, note }));
}
export function playLine(r) {
  const t = view.storePayments?.google_play;
  if (!t || !soldOnPlay(r)) return '';
  const c = view.country;
  if (!c) {
    const ex = [['IN', 'upi'], ['BR', 'pix'], ['ID', 'other'], ['KE', 'mobile_money'], ['PH', 'other'], ['EG', 'carrier_billing']].map(([cc, m]) => { const hit = (t.countries[cc] || []).find(([x]) => x === m); return hit ? `${hit[1] || METHOD_LABELS[m]} in ${countryName(cc)}` : null; }).filter(Boolean);
    const n = Object.values(t.countries).filter((l) => l.some(([m]) => !CARDS.includes(m))).length;
    return `<p class="ln">🛒 Sold in the Android app through Google Play, which accepts other ways to pay than cards in ${n} countries${ex.length ? `, for example ${esc(ex.slice(0, 4).join(', '))}` : ''}. Choose your country to see yours. <a class="src-i" href="${esc(t.source_url)}" rel="noopener" target="_blank" title="Google Play Help">ⓘ</a></p>`;
  }
  const list = t.countries[c];
  const url = t.country_url.replace('{CC}', c);
  const srcLink = `<a class="src-i" href="${esc(url)}" rel="noopener" target="_blank" title="Google Play Help, checked ${esc(fmtDate(t.observed_at))}">ⓘ</a>`;
  if (!list) return `<p class="ln muted">🛒 Google Play's payment page doesn't list ${esc(countryName(c))}, so how you can pay through Google Play there is unknown.<a class="src-i" href="${esc(t.source_url)}" rel="noopener" target="_blank" title="Google Play Help">ⓘ</a></p>`;
  const non = list.filter(([m]) => !CARDS.includes(m));
  return `<p class="ln">🛒 If you subscribe in the Android app, <strong>Google Play in ${esc(countryName(c))}</strong> accepts: ${non.length ? non.map(([m, n]) => `<strong>${esc(n || METHOD_LABELS[m] || m)}</strong>`).join(' · ') + ' · cards' : 'cards only'}${srcLink}</p>`;
}
// A short name for a payment method: its label, or for "other" the first brand named in the note.
export const shortPay = (x) => x.method === 'other' ? String(x.note || 'other').replace(/^e-wallets?:\s*/i, '').split(/[,;(]/)[0].trim() : (METHOD_LABELS[x.method] || x.method);

// Videos CleverFox already collected (official channels, keyword search) that name this listing.
export function ytLine(r) {
  const v = r.yt_videos || [];
  if (!v.length) return '';
  return `<p class="ln">▶️ <strong>On YouTube:</strong> ${v.slice(0, 3).map((x) => `<a href="${esc(x.url)}" rel="noopener" target="_blank">${esc(x.title)}</a> <span class="muted">(${esc(x.channel)}${x.official ? ', official' : ''}, ${esc(fmtDate(x.published_at))})</span>`).join('<span class="sep"> · </span>')} <a class="muted" href="${esc(ytSearchUrl(r))}" rel="noopener" target="_blank">more ↗</a></p>`;
}

// A next step after looking at a listing: similar ones (computed by the build), each with what they share.
export function similarLine(r) {
  const s = r.similar || [];
  if (!s.length) return '';
  return `<p class="ln similar">🔎 <strong>Similar:</strong> ${s.map((x) => `<a href="${esc(view.base + x.path)}">${esc(x.name)}</a> <span class="muted">(${esc(x.shared.join(', ').toLowerCase())})</span>`).join('<span class="sep"> · </span>')}</p>`;
}

// Makers' own news that names this listing (tools/discover.mjs makers' feeds, matched by the build).
export function newsLine(r) {
  const n = r.maker_news || [];
  if (!n.length) return '';
  return `<p class="ln">📰 <strong>In the news:</strong> ${n.map((x) => `<a href="${esc(x.url)}" rel="noopener" target="_blank">${esc(x.title)}</a> <span class="muted">(${esc(x.source)}, ${esc(fmtDate(x.published_at))})</span>`).join('<span class="sep"> · </span>')}</p>`;
}
