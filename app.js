// CleverFox: loads the catalog one listing type at a time and renders it with filters.
import { view, setCountries, esc, METHOD_LABELS, KIND_LABELS, AVAIL_LABELS, langName, countryName, flag, fmtDate, known, CAPS, popularity, availableIn, methodsOf, recordAccesses, anyNoCard, payNoCard, anyFree, card, detail, wireShare, suits, listingPath } from './render.js?v=__BUILD__';
const $ = (sel) => document.querySelector(sel);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};


let catalog;

const TYPES = ['model', 'dataset', 'app', 'host'];
// Rough guide from memory needed to the kind of device that has it.
const MEMORY_CHOICES = [4, 8, 16, 24, 32, 48, 64, 128];
const TYPE_WORDS = { model: 'models', dataset: 'datasets', app: 'apps', host: 'hosting providers' };
const PAGE = 50;
const state = { type: 'model', q: '', cap: '', mem: +(store.get('mem') || 0), country: store.get('country') || '', limit: PAGE, f: { model: {}, dataset: {}, app: {}, host: {} } };
const loaded = {}; // type -> records
const syncView = () => { view.country = state.country; view.mem = state.mem; };
syncView();
const recordsOf = (t) => loaded[t] || [];

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
    { key: 'os', label: 'Runs on any system', opts: [['windows', '🪟 Windows'], ['macos', '🍎 macOS'], ['linux', '🐧 Linux'], ['phone', '📱 Phone'], ['cloud', '☁️ Cloud server']] },
    { key: 'local', toggle: '💻 Runs locally' },
    { key: 'fits', toggle: '✓ Fits my device', needsMem: true },
    { key: 'free', toggle: '🆓 Free' },
    { key: 'nobar', toggle: '🕊️ No barriers' },
    { key: 'uncensored', toggle: 'Uncensored / abliterated' },
    { key: 'bench', toggle: '📊 Has benchmarks' },
    { key: 'xp', toggle: '📣 Praised on X' },
    { key: 'online', toggle: '☁️ Use it online' },
  ];
  if (type === 'dataset') return [
    { key: 'lang', label: 'Any language', opts: options(recs.flatMap((r) => Array.isArray(r.languages?.value) ? r.languages.value : []), langName) },
    { key: 'task', label: 'Any task', opts: options(recs.flatMap((r) => r.tasks || []), (t) => t.replace(/-/g, ' ')) },
    { key: 'size', label: 'Any size', opts: options(recs.map((r) => r.size_category)) },
    { key: 'nobar', toggle: '🕊️ No barriers' },
    { key: 'nogate', toggle: 'No sign-in gate' },
    { key: 'xp', toggle: '📣 Praised on X' },
  ];
  if (type === 'app') return [
    { key: 'cat', label: 'Any category', opts: options(recs.flatMap((r) => r.categories || []), (c) => c[0].toUpperCase() + c.slice(1)) },
    { key: 'method', label: 'Any payment method', opts: methods },
    { key: 'free', toggle: '🆓 Free or free tier' },
    { key: 'nocard', toggle: '💳 Usable without a card' },
    { key: 'here', toggle: 'Available in my country', needsCountry: true },
    { key: 'xp', toggle: '📣 Praised on X' },
  ];
  return [
    { key: 'dc', label: 'Data center anywhere', opts: [['__mine', 'In my country'], ...options(recs.flatMap((r) => Array.isArray(r.data_centers?.value) ? r.data_centers.value.map((d) => d.country) : []), countryName)] },
    { key: 'gpu', label: 'Any GPU', opts: options(recs.flatMap((r) => Array.isArray(r.gpu_types?.value) ? r.gpu_types.value : [])) },
    { key: 'kind', label: 'Any kind', opts: options(recs.flatMap((r) => r.kinds || []), (k) => KIND_LABELS[k] || k) },
    { key: 'method', label: 'Any payment method', opts: methods },
    { key: 'nocard', toggle: 'Pay without a card' },
  ];
}
function renderCaps() {
  const box = $('#caps');
  if (state.type === 'host') { box.hidden = true; return; }
  const have = new Set(recordsOf(state.type).flatMap((r) => r.answers?.good_for || []));
  box.hidden = false;
  box.innerHTML = '<span class="caps-label">What do you need?</span>' + Object.entries(CAPS).filter(([k]) => have.has(k)).map(([k, l]) => `<button type="button" class="cap" data-cap="${k}" aria-pressed="${state.cap === k}">${esc(l)}</button>`).join('');
}
function renderFilters() {
  renderCaps();
  const f = state.f[state.type];
  $('#filters').innerHTML = filterDefs(state.type).map((d) => {
    if (d.toggle) {
      const dis = (d.needsCountry && !state.country) || (d.needsMem && !state.mem);
      return `<label class="toggle"${dis ? ` title="${d.needsMem ? 'Choose your device memory first' : 'Choose your country first'}"` : ''}><input type="checkbox" data-key="${d.key}"${f[d.key] ? ' checked' : ''}${dis ? ' disabled' : ''}> ${esc(d.toggle)}</label>`;
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
  if (state.cap && state.type !== 'host' && !(r.answers?.good_for || []).includes(state.cap)) return false;
  if (f.nobar && !r.answers?.no_barriers) return false;
  if (f.xp && !r.answers?.x_praised) return false;
  if (f.online && !r.answers?.online) return false;
  const hasMethod = (m) => recordAccesses(r).some((a) => methodsOf(a).some((x) => x.method === m));
  if (r.type === 'model') {
    if (f.lang && !(Array.isArray(r.languages?.value) && r.languages.value.includes(f.lang))) return false;
    if (f.region && r.publisher_region?.value !== f.region) return false;
    if (f.avail && r.availability?.value !== f.avail) return false;
    if (f.local && !r.local_ready) return false;
    if (f.os && !r.platforms?.[f.os]) return false;
    if (f.fits && state.mem && !(r.hardware && r.hardware.min_memory_gb <= state.mem)) return false;
    if (f.free && !['free_download', 'free', 'free_tier'].includes(r.answers?.free)) return false;
    if (f.uncensored && !r.answers?.uncensored) return false;
    if (f.bench && !r.answers?.benchmarks && !r.answers?.independent) return false;
    if (f.task && !(r.tasks || []).includes(f.task)) return false;
  } else if (r.type === 'dataset') {
    if (f.lang && !(Array.isArray(r.languages?.value) && r.languages.value.includes(f.lang))) return false;
    if (f.task && !(r.tasks || []).includes(f.task)) return false;
    if (f.size && r.size_category !== f.size) return false;
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
  recs.sort((a, b) => suits(a) - suits(b) || weight(a) - weight(b) || popularity(b) - popularity(a) || a.name.localeCompare(b.name));
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
$('#caps').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-cap]'); if (!b) return;
  state.cap = state.cap === b.dataset.cap ? '' : b.dataset.cap; state.limit = PAGE; renderCaps(); render();
});
// Details are built only when a card is opened (thousands of listings).
$('#list').addEventListener('toggle', (e) => {
  const slot = e.target.querySelector?.('.detail-slot');
  if (!e.target.open || !slot || slot.childElementCount) return;
  const rec = recordsOf(state.type).find((r) => r.id === slot.dataset.id);
  if (!rec) return;
  slot.innerHTML = '<p class="muted loading">Loading details…</p>';
  fullRecord(rec).then((full) => {
    slot.innerHTML = detail(full);
    if (navigator.share) slot.querySelectorAll('[data-act="share"]').forEach((b) => { b.hidden = false; });
  });
}, true);
// The list holds slim records; the full one (sources, links, hardware table) sits next to the listing's page.
const fullCache = new Map();
async function fullRecord(rec) {
  if (rec.type === 'app' || rec.type === 'host') return rec;
  if (!fullCache.has(rec.id)) fullCache.set(rec.id, fetch(`${listingPath(rec)}record.json`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(() => rec));
  return fullCache.get(rec.id);
}
$('#filters').addEventListener('change', (e) => {
  const k = e.target.dataset.key;
  if (!k) return;
  state.f[state.type][k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  state.limit = PAGE;
  render();
});
$('#mem').addEventListener('change', (e) => { state.mem = +e.target.value; syncView(); store.set('mem', e.target.value === '0' ? '' : e.target.value); renderFilters(); render(); });
$('#country').addEventListener('change', (e) => { state.country = e.target.value; syncView(); store.set('country', state.country); renderFilters(); render(); });

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
setCountries(catalog.countries);
view.runtimes = catalog.runtimes || {};
view.site = new URL('.', location.href).href;
wireShare($('#list'));
$('#mem').insertAdjacentHTML('beforeend', MEMORY_CHOICES.map((g) => `<option value="${g}"${g === state.mem ? ' selected' : ''}>${g === 128 ? '128 GB or more' : g + ' GB'}</option>`).join(''));
$('#country').insertAdjacentHTML('beforeend', catalog.countries.map(([c, n]) => `<option value="${c}"${c === state.country ? ' selected' : ''}>${flag(c)} ${esc(n)}</option>`).join(''));
const total = Object.values(catalog.counts).reduce((a, b) => a + b, 0);
$('#generated').textContent = `Catalog built ${fmtDate(catalog.generated_at)} · ${total} listings`;
const hashType = location.hash.match(/^#(model|dataset|app|host)$/)?.[1];
await setType(hashType || state.type);
