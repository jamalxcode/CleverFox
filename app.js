// CleverFox: loads the catalog one listing type at a time and renders it with filters.
import { LANGS, t, pickLang, applyLang } from './i18n.js?v=__BUILD__';
import { pickModelsLocal, pickModelsOnline, pickApps, pickOffline, TASKS, encodeStart, decodeStart, ORDERING } from './picks.js?v=__BUILD__';
import * as you from './you.js?v=__BUILD__';
import { verdictStrip, plainWhat } from './render.js?v=__BUILD__';
import { view, setCountries, esc, METHOD_LABELS, KIND_LABELS, AVAIL_LABELS, langName, countryName, flag, fmtDate, known, CAPS, popularity, availableIn, methodsOf, recordAccesses, anyNoCard, payNoCard, anyFree, card, detail, wireShare, suits, listingPath, FREE_TEXT, FREE_LABELS } from './render.js?v=__BUILD__';
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
const state = { type: 'model', q: '', cap: '', sort: '', mem: +(store.get('mem') || 0), country: store.get('country') || '', ulang: store.get('ulang') || '', limit: PAGE, f: { model: {}, dataset: {}, app: {}, host: {} } };
const loaded = {}; // type -> records
const syncView = () => { view.country = state.country; view.mem = state.mem; view.ulang = state.ulang; };
syncView();
const recordsOf = (t) => loaded[t] || [];

// ---- filters ----
function options(values, labeler = (v) => v) {
  return [...new Set(values.filter(Boolean))].map((v) => [v, labeler(v)]).sort((a, b) => a[1].localeCompare(b[1]));
}
// Languages: one entry per language (several codes, such as ay/aym/ayr, name the same one), only codes the
// browser can name (bare codes like "atj" are left out), with how many listings have it. The value is the name.
const langOf = (c) => { const n = langName(c); return n && !/^[a-z]{2,3}([-_][a-z0-9]+)*$/i.test(n) ? n : null; };
const langsOf = (r) => new Set((Array.isArray(r.languages?.value) ? r.languages.value : []).map(langOf).filter(Boolean));
function langOptions(recs) {
  const n = {};
  for (const r of recs) for (const l of langsOf(r)) n[l] = (n[l] || 0) + 1;
  return Object.entries(n).sort((a, b) => a[0].localeCompare(b[0])).map(([l, c]) => [l, `${l} (${c})`]);
}
function filterDefs(type) {
  const recs = recordsOf(type);
  const methods = options(recs.flatMap((r) => recordAccesses(r).flatMap((a) => methodsOf(a).map((m) => m.method))), (m) => METHOD_LABELS[m] || m);
  if (type === 'model') return [
    { key: 'lang', label: 'Any language', opts: langOptions(recs) },
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
    { key: 'versions', toggle: '🔁 Show community versions' },
  ];
  if (type === 'dataset') return [
    { key: 'lang', label: 'Any language', opts: langOptions(recs) },
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
    { key: 'offline', toggle: '📱 Offline on your phone' },
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
  labelFiltersBtn();
}
// Filters fold behind one button that shows how many are in use; they open by themselves when some are.
function labelFiltersBtn() {
  const n = Object.values(state.f[state.type]).filter(Boolean).length;
  $('#filters-btn').textContent = `⚙️ Filters${n ? ` (${n})` : ''}`;
  if (n && $('#filters').hidden) { $('#filters').hidden = false; $('#filters-btn').setAttribute('aria-expanded', 'true'); }
}
$('#filters-btn').addEventListener('click', () => { const open = $('#filters').hidden; $('#filters').hidden = !open; $('#filters-btn').setAttribute('aria-expanded', String(open)); });

const idCache = new Map();
const idsOf = (t) => { const list = recordsOf(t); const c = idCache.get(t); if (c && c.list === list) return c.ids; const ids = new Set(list.map((x) => x.id)); idCache.set(t, { list, ids }); return ids; };
function matches(r) {
  const f = state.f[r.type];
  // Community versions sit under their original ("+N community versions") unless asked for, or a search is typed.
  if (r.copy_of && !f.versions && !state.q && idsOf(r.type).has(r.copy_of)) return false;
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
  if (f.offline && !r.on_device) return false;
  const hasMethod = (m) => recordAccesses(r).some((a) => methodsOf(a).some((x) => x.method === m));
  if (r.type === 'model') {
    if (f.lang && !langsOf(r).has(f.lang)) return false;
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
    if (f.lang && !langsOf(r).has(f.lang)) return false;
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
    if (f.nocard && !payNoCard(r.access, state.country)) return false;
  }
  return true;
}

// What people look for but don't find: counted as GoatCounter events (the search words only, nothing about the person).
let emptyTimer = null;
function trackEmpty(path) {
  clearTimeout(emptyTimer);
  emptyTimer = setTimeout(() => { try { window.goatcounter?.count?.({ path, title: 'No results', event: true }); } catch {} }, 2000);
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
  // With nothing narrowed, everyday models (chat, writing, coding, images, speech…) come before building blocks such as embeddings.
  const EVERYDAY = ['chat', 'writing', 'coding', 'images', 'speech', 'video', 'translation', 'vision'];
  // Ready to run comes first: everyday models you can run yourself, then everyday models used online, then the rest.
  const plain = (r) => (state.cap || state.q || r.type !== 'model') ? 0 : !(r.answers?.good_for || []).some((c) => EVERYDAY.includes(c)) ? 2 : r.local_ready ? 0 : 1;
  const isFree = (r) => ['free_download', 'free', 'free_tier'].includes(r.answers?.free) || ['free', 'free_tier'].includes(r.access?.free?.value) ? 0 : 1;
  const SORTS = { popular: (a, b) => popularity(b) - popularity(a), new: (a, b) => String(b.first_seen_at || '').localeCompare(String(a.first_seen_at || '')), free: (a, b) => isFree(a) - isFree(b) };
  const best = (a, b) => suits(a) - suits(b) || plain(a) - plain(b) || weight(a) - weight(b) || popularity(b) - popularity(a) || a.name.localeCompare(b.name);
  recs.sort((a, b) => (SORTS[state.sort]?.(a, b) || 0) || best(a, b));
  $('#list').innerHTML = recs.slice(0, state.limit).map(card).join('');
  $('#empty').hidden = recs.length > 0;
  // The tab and the filters in use, never the words typed.
  if (!recs.length && (state.q || Object.values(state.f[state.type]).some(Boolean))) trackEmpty(`search-empty/${state.type}/${Object.entries(state.f[state.type]).filter(([, v]) => v).map(([k]) => k).sort().join('+') || 'text'}${state.cap ? '/' + state.cap : ''}`);
  $('#more-btn').hidden = recs.length <= state.limit;
  $('#more-btn').textContent = `Show more (${recs.length - state.limit} left)`;
  const narrowed = activeFilters().length;
  const grouped = narrowed ? 0 : all.length - recs.length; // community versions shown under their original
  const SORT_WORDS = { '': 'best for you first', popular: 'most popular first', new: 'newest first', free: 'free first' };
  $('#summary').textContent = `${narrowed ? `${recs.length} of ${all.length}` : recs.length} ${TYPE_WORDS[state.type]} · ${SORT_WORDS[state.sort] || SORT_WORDS['']}${grouped ? ` · ${grouped} community versions grouped` : ''}${state.country && state.type !== 'dataset' ? ` · access for ${countryName(state.country)}` : ''}`;
  if (activeFilters().length) $('#summary').insertAdjacentHTML('beforeend', ' · <button type="button" class="linkish" data-clear-all>clear filters</button>');
  $('#empty-help').innerHTML = recs.length ? '' : emptyHelp();
  rememberView();
}
// ---- continuation: the filters in use, and what each would show if removed (for empty results) ----
function activeFilters() {
  const f = state.f[state.type]; const defs = filterDefs(state.type); const out = [];
  if (state.q) out.push({ key: 'q', label: `search “${state.q}”` });
  if (state.cap && state.type !== 'host') out.push({ key: 'cap', label: CAPS[state.cap] || state.cap });
  for (const d of defs) if (f[d.key]) out.push({ key: d.key, label: d.toggle || d.opts.find(([v]) => v === f[d.key])?.[1] || d.label });
  return out;
}
function without(key, fn) {
  const f = state.f[state.type]; const saved = { q: state.q, cap: state.cap, v: f[key] };
  if (key === 'q') state.q = ''; else if (key === 'cap') state.cap = ''; else f[key] = key in f && typeof f[key] === 'boolean' ? false : '';
  try { return fn(); } finally { state.q = saved.q; state.cap = saved.cap; if (key !== 'q' && key !== 'cap') f[key] = saved.v; }
}
function emptyHelp() {
  const act = activeFilters(); const all = recordsOf(state.type);
  const tries = act.map((a) => ({ ...a, n: without(a.key, () => all.filter(matches).length) })).filter((a) => a.n > 0).sort((a, b) => b.n - a.n);
  const other = TYPES.filter((t) => t !== state.type && loaded[t] && state.q).map((t) => [t, loaded[t].filter((r) => { const c = state.cap; state.cap = ''; const ok = matchesText(r); state.cap = c; return ok; }).length]).filter(([, n]) => n);
  return (tries.length ? `<p>Remove one filter: ${tries.slice(0, 4).map((a) => `<button type="button" class="share-btn" data-unfilter="${esc(a.key)}">✕ ${esc(a.label)} <span class="muted">(${a.n})</span></button>`).join(' ')}</p>` : '')
    + (other.length ? `<p>Or look in ${other.map(([t, n]) => `<button type="button" class="share-btn" data-goto="${t}">${esc(TYPE_WORDS[t])} (${n})</button>`).join(' ')}</p>` : '')
    + (act.length > 1 ? '<p><button type="button" class="linkish" data-clear-all>Clear all filters</button></p>' : '');
}
const matchesText = (r) => { const hay = [r.name, r.publisher, r.description, r.family].join(' ').toLowerCase(); return state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w)); };
function clearFilters(key) {
  if (!key || key === 'q') { state.q = ''; $('#q').value = ''; }
  if (!key || key === 'cap') state.cap = '';
  if (!key) state.f[state.type] = {}; else if (key !== 'q' && key !== 'cap') delete state.f[state.type][key];
  state.limit = PAGE; renderFilters(); render();
}
document.addEventListener('click', (e) => {
  const u = e.target.closest('[data-unfilter]'); if (u) return clearFilters(u.dataset.unfilter);
  if (e.target.closest('[data-clear-all]')) return clearFilters();
  const g = e.target.closest('[data-goto]'); if (g) setType(g.dataset.goto);
});
// ---- accumulating value: resume the last tab, search and filters ----
let viewTimer = null;
function rememberView() {
  clearTimeout(viewTimer);
  viewTimer = setTimeout(() => you.update((d) => { d.view = { type: state.type, q: state.q, cap: state.cap, sort: state.sort, f: state.f }; }), 600);
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
$('#sort').addEventListener('change', (e) => { state.sort = e.target.value; state.limit = PAGE; render(); });
// ---- getting around a long page: a slim sticky bar once the top has scrolled away, and back to top ----
{
  const top = $('#to-top'); const bar = $('#topbar');
  const onScroll = () => { const far = scrollY > innerHeight * 1.5; if (top.hidden === far) top.hidden = !far; };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  top.addEventListener('click', () => { const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'; scrollTo({ top: 0, behavior: smooth }); document.querySelector('.pane-find')?.scrollTo({ top: 0, behavior: smooth }); });
  // The bar's height, so the sticky Find pane and jumps to a section sit just below it.
  const fitBar = () => document.documentElement.style.setProperty('--bar-h', `${bar.offsetHeight}px`);
  fitBar(); new ResizeObserver(fitBar).observe(bar);
  // ⭐ Saved shows in the bar only while "Your CleverFox" has something in it.
  const syncSaved = () => { $('#mb-saved').hidden = $('#you').hidden; };
  syncSaved(); new MutationObserver(syncSaved).observe($('#you'), { attributes: true, attributeFilter: ['hidden'] });
  $('#mb-search').addEventListener('click', () => { $('#browse').scrollIntoView(); $('#q').focus({ preventScroll: true }); });
}
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
  you.addRecent(rec, listingPath(rec)); renderYou();
  fullRecord(rec).then((full) => {
    slot.innerHTML = detail(full);
    labelSaves(slot);
    if (navigator.share) slot.querySelectorAll('[data-act="share"]').forEach((b) => { b.hidden = false; });
  });
}, true);
// The list holds slim records; the full one (sources, links, hardware table) sits next to the listing's page.
const fullCache = new Map();
async function fullRecord(rec) {
  if (!fullCache.has(rec.id)) fullCache.set(rec.id, fetch(`${listingPath(rec)}record.json`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(() => rec));
  return fullCache.get(rec.id);
}
$('#filters').addEventListener('change', (e) => {
  const k = e.target.dataset.key;
  if (!k) return;
  state.f[state.type][k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  state.limit = PAGE;
  labelFiltersBtn();
  render();
});
$('#mem').addEventListener('change', (e) => { state.mem = +e.target.value; syncView(); store.set('mem', e.target.value === '0' ? '' : e.target.value); renderFilters(); render(); renderSetup(); if ($('#picks').childElementCount) showPicks(false); });
$('#ulang').addEventListener('change', (e) => { state.ulang = e.target.value; syncView(); store.set('ulang', state.ulang); render(); renderSetup(); if ($('#picks').childElementCount) showPicks(false); });
$('#country').addEventListener('change', (e) => { state.country = e.target.value; syncView(); store.set('country', state.country); renderFilters(); render(); renderSetup(); if ($('#picks').childElementCount) showPicks(false); });

// Three looks: Dark ("Matrix", the default), In between (dim slate) and Light ("terminal paper"), stored as "look".
// (The old "theme" setting from the first design is ignored, so everyone starts on Dark.)
const LOOKS = ['', 'dim', 'light'];
function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  document.querySelectorAll('#look [data-look]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.look === t)));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f1faf5' : t === 'dim' ? '#3b4449' : '#04070a');
}
$('#look').addEventListener('click', (e) => { const b = e.target.closest('[data-look]'); if (!b) return; const t = LOOKS.includes(b.dataset.look) ? b.dataset.look : ''; store.set('look', t); applyTheme(t); });
applyTheme(LOOKS.includes(store.get('look')) ? store.get('look') : '');

// ---- start ----
try {
  catalog = await (await fetch('data/meta.json')).json();
} catch {
  $('#summary').textContent = 'The catalog could not be loaded. Try reloading the page.';
  throw new Error('catalog load failed');
}
setCountries(catalog.countries);
view.runtimes = catalog.runtimes || {};
view.storePayments = catalog.store_payments || null;
view.site = new URL('.', location.href).href;
wireShare($('#list'));
$('#mem').insertAdjacentHTML('beforeend', MEMORY_CHOICES.map((g) => `<option value="${g}"${g === state.mem ? ' selected' : ''}>${g === 128 ? '128 GB or more' : g + ' GB'}</option>`).join(''));
$('#country').insertAdjacentHTML('beforeend', catalog.countries.map(([c, n]) => `<option value="${c}"${c === state.country ? ' selected' : ''}>${flag(c)} ${esc(n)}</option>`).join(''));
// "AI that speaks": one entry per language the browser can name (like the language filter, decision 74):
// bare codes such as "aa" and repeats such as two "Akan" entries are left out. A saved choice is always kept.
{
  const named = new Map();
  for (const l of catalog.languages || []) { const n = langName(l); if ((n && !/^[a-z]{2,3}([-_][a-z0-9]+)*$/i.test(n) && !named.has(n)) || l === state.ulang) named.set(n || l, l); }
  $('#ulang').insertAdjacentHTML('beforeend', [...named].sort((a, b) => a[0].localeCompare(b[0])).map(([n, l]) => `<option value="${l}"${l === state.ulang ? ' selected' : ''}>${esc(n)}</option>`).join(''));
}
const total = Object.values(catalog.counts).reduce((a, b) => a + b, 0);
$('#generated').textContent = `Catalog built ${fmtDate(catalog.generated_at)} · ${total} listings`;
$('#browse-sub').textContent = `${total.toLocaleString('en')} AI models, datasets, apps and hosting providers: search, filter and compare them all.`;
// Freshness: when each source last refreshed; a stale one is flagged, so a deploy doesn't look like everything refreshed.
{
  const ago = (at) => { const h = (Date.now() - new Date(at)) / 3600000; return h < 1 ? 'under an hour ago' : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`; };
  const parts = (catalog.freshness || []).map((s) => !s.at ? `<span class="stale">⚠️ ${esc(s.label)}: not yet</span>` : (Date.now() - new Date(s.at)) / 3600000 > s.max_hours ? `<span class="stale">⚠️ ${esc(s.label)}: ${esc(ago(s.at))}</span>` : `${esc(s.label)}: ${esc(ago(s.at))}`);
  if (parts.length) $('#generated').insertAdjacentHTML('afterend', `<p class="muted fresh">🔄 Last refreshed: ${parts.join(' · ')}</p>`);
}
// ---- compare up to 3 listings (same type) ----
const cmp = [];
const recById = (id) => TYPES.flatMap((t) => loaded[t] || []).find((r) => r.id === id);
function renderCompareBar() {
  $('#compare-bar').hidden = !cmp.length;
  $('#compare-names').textContent = cmp.map((id) => recById(id)?.name || id).join(' · ');
  // Change only what differs: the list observer below would otherwise loop forever.
  document.querySelectorAll('[data-compare]').forEach((b) => {
    if (b.hidden) b.hidden = false;
    const t = cmp.includes(b.dataset.compare) ? '✓ In compare' : '⚖️ Compare';
    if (b.textContent !== t) b.textContent = t;
  });
}
function compareTable(recs) {
  const yes = (v) => v === true ? '✓' : v === false ? '✗' : '—';
  const rows = [
    ['Publisher', (r) => esc(r.publisher_name || r.publisher || '')],
    ['Good for', (r) => esc((r.answers?.good_for || []).map((c) => CAPS[c] || c).join(', '))],
    ['Free', (r) => esc(FREE_TEXT[r.answers?.free] || FREE_LABELS[r.access?.free?.value] || 'unknown')],
    ['Runs locally', (r) => r.type === 'model' ? yes(!!r.local_ready) : '—'],
    ['Memory needed', (r) => r.hardware ? `~${r.hardware.min_memory_gb} GB (${r.hardware.recommended_gb} GB recommended)` : '—'],
    ['Use it online', (r) => r.answers?.online ? (r.online_from === 0 ? 'free' : Number.isFinite(r.online_from) ? `from $${r.online_from} / M tokens` : 'yes') : '—'],
    ['Independent benchmark', (r) => esc((r.independent_benchmarks || []).map((b) => `${b.id === 'epoch_eci' ? 'ECI' : 'AA'} ${b.display}`).join(', ') || '—')],
    ['License', (r) => esc(r.license?.value || '—')],
    [state.country ? `Available in ${countryName(state.country)}` : 'Available in your country', (r) => state.country ? esc(r.type === 'model' && (r.distributions || []).some((d) => d.availability === 'downloadable') ? 'download' : availableIn(r.access, state.country)) : 'choose your country'],
    ['Pay without a card', (r) => yes(r.access ? payNoCard(r.access, state.country) : (r.answers?.online_no_card || null))],
    ['Offline on a phone', (r) => r.type === 'app' ? yes(!!r.on_device) : '—'],
    ['Praised on X', (r) => yes(!!r.answers?.x_praised)],
  ];
  return `<div class="cmp-scroll"><table class="cmp"><thead><tr><th></th>${recs.map((r) => `<th><a href="${esc(listingPath(r))}">${esc(r.name)}</a></th>`).join('')}</tr></thead><tbody>${rows.map(([h, f]) => `<tr><th>${esc(h)}</th>${recs.map((r) => `<td>${f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
async function showCompare(ids, push = true) {
  const types = [...new Set(ids.map((id) => id.split(':')[1]))];
  await Promise.all(types.filter((t) => TYPES.includes(t)).map(ensureLoaded));
  const recs = ids.map(recById).filter(Boolean);
  if (!recs.length) return;
  $('#compare').hidden = false;
  $('#compare-table').innerHTML = compareTable(recs) + `<p class="share"><button class="share-btn" type="button" id="cmp-share">🔗 Share this comparison</button></p>`;
  if (push) history.replaceState(null, '', `#compare=${recs.map((r) => r.id).join('|')}`);
  $('#cmp-share').addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); $('#cmp-share').textContent = '✓ Link copied'; } catch { prompt('Copy this link:', location.href); } });
  $('#compare').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('#list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-compare]'); if (!b) return;
  const id = b.dataset.compare; const i = cmp.indexOf(id);
  if (i >= 0) cmp.splice(i, 1); else { if (cmp.length && cmp[0].split(':')[1] !== id.split(':')[1]) cmp.length = 0; cmp.push(id); if (cmp.length > 3) cmp.shift(); }
  renderCompareBar();
});
$('#compare-go').addEventListener('click', () => showCompare(cmp));
$('#compare-clear').addEventListener('click', () => { cmp.length = 0; renderCompareBar(); $('#compare').hidden = true; });
new MutationObserver((ms) => { if (ms.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches?.('[data-compare]') || n.querySelector?.('[data-compare]'))))) renderCompareBar(); }).observe($('#list'), { childList: true, subtree: true });

// ---- find what to use: top picks ----
// ---- interface language ----
function renderTasks() { const v = $('#s-task').value; $('#s-task').innerHTML = TASKS.map((k) => `<option value="${k}">${esc(t('t_' + k))}</option>`).join(''); if (v) $('#s-task').value = v; }
$('#lang').innerHTML = Object.entries(LANGS).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('');
$('#lang').value = pickLang(store.get('lang'));
applyLang($('#lang').value); renderTasks();
$('#lang').addEventListener('change', (e) => { store.set('lang', e.target.value); applyLang(e.target.value); renderTasks(); if ($('#picks').childElementCount) showPicks(false); });

async function showPicks(share = true) {
  const s = { task: $('#s-task').value, device: $('#s-device').value, mem: state.mem, country: state.country, ulang: state.ulang };
  $('#picks').innerHTML = `<p class="muted">${esc(t('finding'))}</p>`;
  await Promise.all([ensureLoaded('model'), ensureLoaded('app')]);
  const models = loaded.model || []; const apps = loaded.app || [];
  // Lanes in the order that suits the device: run it yourself first on a computer, apps first on a phone or the web;
  // the API lane ("For developers") always last, since it needs code.
  const cols = [];
  if (s.device === 'computer') cols.push([t('runself'), pickModelsLocal(models, s), `${t('runNote')} ${s.mem ? `≤ ${s.mem} GB` : '(8 GB)'}`]);
  cols.push([t('appsCol'), pickApps(apps, s), t('appsNote')]);
  if (s.device === 'phone') cols.push([t('offline'), pickOffline(apps, s), t('offNote')]);
  cols.push([t('online'), pickModelsOnline(models, s), t('onlineNote')]);
  you.update((d) => { d.picks = { task: s.task, device: s.device }; });
  pickRecs.clear();
  // The first pick of each lane is featured (plain description, its verdicts, a Start button); the others are compact,
  // with their two most telling reasons (no "no independent score yet" or provider counts).
  const NOISE = /no independent score yet|^\d+ providers?$/i;
  const save = (r) => `<button type="button" class="save-mini" data-save="${esc(r.id)}" aria-pressed="false" aria-label="Save ${esc(r.name)}">☆ Save</button>`;
  const item = (p, i) => {
    pickRecs.set(p.r.id, p.r);
    const head = `<a href="${esc(listingPath(p.r))}"><strong>${esc(p.r.name)}</strong></a> <span class="muted">${esc(p.r.publisher_name || p.r.publisher || '')}</span>`;
    if (i === 0) return `<li class="pick-feat"><div class="pf-head">${head}</div><p class="pf-desc">${esc(plainWhat(p.r))}</p>${verdictStrip(p.r, 3)}<p class="pf-act"><a class="share-btn" href="${esc(listingPath(p.r))}#start">Start →</a> ${save(p.r)}</p></li>`;
    const why = p.reasons.filter((x) => !NOISE.test(x)).slice(0, 2);
    return `<li>${head} ${save(p.r)}${why.length ? `<div class="why">${why.map((x) => `<span class="chip">${esc(x)}</span>`).join(' ')}</div>` : ''}</li>`;
  };
  // An empty column offers the nearest alternative instead of a dead end.
  const alt = (h) => h === t('runself') ? `<button type="button" class="share-btn" data-alt-device="online">${esc(t('web'))}</button>${state.mem && state.mem < 128 ? ' <span class="muted">or choose more memory above</span>' : ''}` : h === t('offline') ? `<button type="button" class="share-btn" data-alt-device="computer">${esc(t('computer'))}</button>` : `<button type="button" class="share-btn" data-alt-task="chat">${esc(t('t_chat'))}</button>`;
  for (const [h, list] of cols) if (!list.length) try { window.goatcounter?.count?.({ path: `picks-empty/${h.replace(/^\S+\s/, '')}/${s.task}/${s.device}/${s.country || 'any'}/${s.ulang || 'any'}`, title: 'No picks', event: true }); } catch {}
  $('#picks').innerHTML = `<p class="muted swipe-hint">Swipe for more lanes →</p><div class="pick-cols">${cols.map(([h, list, note]) => `<div class="pick-col"><h3>${h}</h3><p class="muted pick-note">${esc(note)}</p>${list.length ? `<ol class="pick-list">${item(list[0], 0)}</ol>${list.length > 1 ? `<details class="pick-rest"${matchMedia('(min-width: 701px) and (max-width: 1099px)').matches ? ' open' : ''}><summary>+${list.length - 1} more</summary><ol class="pick-list">${list.slice(1).map((p) => item(p, 1)).join('')}</ol></details>` : ''}` : `<p class="muted">${esc(t('nothing'))}</p><p>Try: ${alt(h)}</p>`}</div>`).join('')}</div>
    ${foxTip(s, cols)}
    ${nextSteps(cols)}
    <details class="pick-how"><summary>How picks are ordered</summary><ul>${[ORDERING.local, ORDERING.offline, ORDERING.apps, ORDERING.online, ORDERING.not].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>
    <p class="share pick-share"><button class="share-btn" type="button" id="s-share">${esc(t('share'))}</button></p>`;
  labelSaves($('#picks'));
  $('#s-go').classList.add('go-quiet'); // the picks' own next step is now the one primary action
  if (share) history.replaceState(null, '', encodeStart(s));
  $('#s-share').addEventListener('click', async () => {
    const url = location.href;
    try { if (navigator.share) await navigator.share({ title: 'My CleverFox picks', url }); else { await navigator.clipboard.writeText(url); $('#s-share').textContent = '✓ Link copied'; } } catch { /* cancelled */ }
  });
  try { window.goatcounter?.count?.({ path: `picks/${s.task}/${s.device}`, event: true }); } catch {}
}
// A short tip from the fox under the picks: what to do next, or why the first lane is worth a look.
function foxTip(s, cols) {
  const tip = !s.country ? 'Tell me your country above and I\'ll check where each one works and how you can pay.'
    : !s.mem && s.device === 'computer' ? 'Set your device memory and I\'ll only pick models that fit.'
    : s.device === 'computer' ? 'Psst: models you run yourself are free and private, and keep working offline.'
    : s.device === 'phone' ? 'Psst: the offline phone apps keep working with no signal.'
    : 'Tap ☆ Save on anything you like, and it waits for you in Your CleverFox.';
  return `<p class="fox-tip">🦊 ${esc(tip)}</p>`;
}
// ---- clear next steps after picks: one main suggestion, then quieter ones; a clear stopping point ----
const pickRecs = new Map();
function nextSteps(cols) {
  const col = cols.find(([, list]) => list.length >= 2 && new Set(list.map((p) => p.r.type)).size === 1);
  const first = cols.find(([, list]) => list.length)?.[1][0];
  if (!first) return '';
  return `<p class="next-step"><strong>Next:</strong> <a class="go-btn go-small" href="${esc(listingPath(first.r))}#start">How to start with ${esc(first.r.name)} →</a>${col ? ` <button type="button" class="share-btn" data-cmp-top="${esc(col[1].map((p) => p.r.id).join('|'))}">⚖️ Compare ${col[1].length}</button>` : ''} <span class="muted">· ☆ save the ones you like to find them later</span></p>`;
}
$('#picks').addEventListener('click', (e) => {
  const c = e.target.closest('[data-cmp-top]'); if (c) { cmp.length = 0; cmp.push(...c.dataset.cmpTop.split('|')); renderCompareBar(); showCompare(cmp); return; }
  const d = e.target.closest('[data-alt-device]'); if (d) { $('#s-device').value = d.dataset.altDevice; showPicks(); return; }
  const k = e.target.closest('[data-alt-task]'); if (k) { $('#s-task').value = k.dataset.altTask; showPicks(); }
});

// ---- saving listings (☆ / ★) in the list, the details and the picks ----
function labelSaves(root) {
  root.querySelectorAll('[data-save]').forEach((b) => {
    const on = you.isSaved(b.dataset.save); b.hidden = false; b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? '★ Saved' : '☆ Save';
  });
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-save]'); if (!b) return;
  const id = b.dataset.save; const r = pickRecs.get(id) || recById(id) || you.load().saved.find((x) => x.id === id);
  if (!r) return;
  if (you.toggleSave(r, r.path || listingPath(r))) toast('⭐ Saved! Find it in Your CleverFox.');
  document.querySelectorAll(`[data-save="${CSS.escape(id)}"]`).forEach((x) => labelSaves(x.parentElement));
  renderYou();
});

// ---- effortless start: what's set, what's missing, one tap to fix (country suggested from the browser's language) ----
function renderSetup() {
  // The pickers are the setup: each shows ✓ once set. The country suggested by the browser's language is one tap, never set by itself.
  const guess = (navigator.language || '').split('-')[1]?.toUpperCase();
  const known2 = guess && catalog.countries.some(([c]) => c === guess) ? guess : null;
  $('#pick-mem').classList.toggle('set', !!state.mem);
  $('#pick-country').classList.toggle('set', !!state.country);
  $('#pick-ulang').classList.toggle('set', !!state.ulang);
  $('#country-guess').innerHTML = !state.country && known2 ? `<button type="button" class="linkish" data-set-country="${known2}">${flag(known2)} ${esc(countryName(known2))}?</button>` : '';
}
$('#country-guess').addEventListener('click', (e) => {
  const c = e.target.closest('[data-set-country]'); if (!c) return;
  $('#country').value = c.dataset.setCountry; $('#country').dispatchEvent(new Event('change'));
});

// ---- your CleverFox: new for you, saved, recently viewed, reminders, your data ----
const prevVisit = you.markVisit();
function newForYou() {
  const d = you.load(); if (!prevVisit) return [];
  const task = d.picks?.task;
  const recs = [...(loaded.model || []), ...(loaded.app || [])].filter((r) => r.first_seen_at && r.first_seen_at > prevVisit && r.warning === 'none' && !r.answers?.uncensored);
  const forTask = task ? recs.filter((r) => (r.answers?.good_for || []).includes(task)) : recs;
  return (forTask.length ? forTask : recs).filter((r) => r.type !== 'model' || !state.mem || !r.hardware || r.hardware.min_memory_gb <= state.mem || r.answers?.online)
    .filter((r) => r.type !== 'app' || !state.country || availableIn(r.access, state.country) !== 'no').sort((a, b) => popularity(b) - popularity(a));
}
function renderYou() {
  const d = you.load(); const fresh = newForYou();
  const box = $('#you');
  box.hidden = !(d.saved.length || d.recent.length || fresh.length || prevVisit);
  if (box.hidden) return;
  const link = (x) => `<a href="${esc(x.path)}">${esc(x.name)}</a> <span class="muted">${esc(x.publisher || '')}</span>`;
  $('#you-sum').textContent = [d.saved.length && `${d.saved.length} saved`, d.recent.length && `${d.recent.length} viewed`, fresh.length && `${fresh.length} new for you`].filter(Boolean).join(' · ');
  $('#you-new').innerHTML = prevVisit ? `<h3>🆕 New for you since ${esc(fmtDate(prevVisit))}${d.picks?.task ? ` <span class="muted">(${esc(t('t_' + d.picks.task))})</span>` : ''}</h3>${fresh.length ? `<ul class="you-list">${fresh.slice(0, 6).map((r) => `<li>${link({ name: r.name, path: listingPath(r), publisher: r.publisher_name || r.publisher })}</li>`).join('')}</ul>${fresh.length > 6 ? `<p class="muted">+${fresh.length - 6} more · <a href="new/">everything new this week</a></p>` : ''}` : '<p class="muted">Nothing new for you since then. <a href="new/">Everything new this week</a></p>'}` : '';
  $('#you-saved').innerHTML = `<h3>☆ Saved</h3>${d.saved.length ? `<ul class="you-list">${d.saved.map((x) => `<li>${link(x)} <button type="button" class="linkish" data-unsave="${esc(x.id)}" aria-label="Remove ${esc(x.name)}">remove</button></li>`).join('')}</ul>${d.saved.length >= 2 && new Set(d.saved.map((x) => x.type)).size === 1 ? `<p><button type="button" class="share-btn" data-cmp-saved>⚖️ Compare ${Math.min(3, d.saved.length)}</button></p>` : ''}` : '<p class="muted">Tap ☆ Save on any listing or pick to keep it here.</p>'}`;
  $('#you-recent').innerHTML = d.recent.length ? `<h3>🕘 Pick up where you left off</h3><ul class="you-list">${d.recent.slice(0, 8).map((x) => `<li>${link(x)}</li>`).join('')}</ul>` : '';
  $('#you-remind').value = d.remind || 'off';
  $('#you-ics').hidden = $('#you-remind-note').hidden = (d.remind || 'off') === 'off';
  const task = d.picks?.task;
  $('#you-feed').href = task ? `feeds/${task}.xml` : 'feed.xml';
  $('#you-feed').textContent = task ? `📰 RSS: new for ${t('t_' + task).toLowerCase()}` : '📰 RSS for new listings';
  if (fresh.length && !box.dataset.opened) { $('#you-box').open = true; box.dataset.opened = '1'; }
}
$('#you').addEventListener('click', (e) => {
  const u = e.target.closest('[data-unsave]');
  if (u) { const x = you.load().saved.find((s) => s.id === u.dataset.unsave); if (x) you.toggleSave(x, x.path); renderYou(); labelSaves(document); return; }
  if (e.target.closest('[data-cmp-saved]')) { const ids = you.load().saved.slice(0, 3).map((s) => s.id); cmp.length = 0; cmp.push(...ids); renderCompareBar(); showCompare(cmp); }
});
$('#you-remind').addEventListener('change', (e) => { you.update((d) => { d.remind = e.target.value; }); renderYou(); });
$('#you-ics').addEventListener('click', () => you.reminderFile(you.load().remind, view.site));
$('#you-export').addEventListener('click', () => you.exportFile());
$('#you-import').addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try { you.importText(await f.text()); renderYou(); labelSaves(document); alert('Your saved listings and history are loaded.'); } catch (err) { alert(err.message || 'That file could not be read.'); }
  e.target.value = '';
});
$('#you-clear').addEventListener('click', () => { if (confirm('Clear your saved listings, history and reminder choice from this browser?')) { you.clearAll(); you.markVisit(); renderYou(); labelSaves(document); } });

$('#s-go').addEventListener('click', () => showPicks());
// Quick-start presets: one tap fills the question (and memory or language where it matters) and shows picks.
const PRESETS = { phone: { task: 'chat', device: 'phone', mem: 4 }, code16: { task: 'coding', device: 'computer', mem: 16 }, arabic: { task: 'chat', device: 'online', ulang: 'ar' }, images: { task: 'images', device: 'online' } };
$('#presets').addEventListener('click', (e) => {
  const p = PRESETS[e.target.closest('[data-preset]')?.dataset.preset]; if (!p) return;
  $('#s-task').value = p.task; $('#s-device').value = p.device;
  if (p.mem && $('#mem').querySelector(`option[value="${p.mem}"]`)) { $('#mem').value = String(p.mem); $('#mem').dispatchEvent(new Event('change')); }
  if (p.ulang && $('#ulang').querySelector(`option[value="${p.ulang}"]`)) { $('#ulang').value = p.ulang; $('#ulang').dispatchEvent(new Event('change')); }
  showPicks();
  try { window.goatcounter?.count?.({ path: `preset/${e.target.closest('[data-preset]').dataset.preset}`, event: true }); } catch {}
});
// 🎲 Surprise me: a random listing that suits the visitor's setup (or, without one, a checked listing with no warnings).
$('#surprise').addEventListener('click', async () => {
  await ensureLoaded(state.type);
  const pool = recordsOf(state.type).filter((r) => r.warning === 'none' && !r.copy_of && !r.answers?.uncensored && r.listing_status?.value !== 'removed_at_source' && ((view.mem || view.country) ? suits(r) === 0 : r.verification_status === 'verified'));
  const pickOne = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  if (!pickOne) { toast('🦊 Nothing to surprise you with here yet. Try another tab.'); return; }
  try { window.goatcounter?.count?.({ path: `surprise/${state.type}`, event: true }); } catch {}
  location.href = `${listingPath(pickOne)}`;
});
// The fox's short notes: saved, or nothing to show.
let toastTimer = null;
function toast(text) { const el = $('#toast'); el.textContent = text; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2600); }
['#s-task', '#s-device'].forEach((s) => $(s).addEventListener('change', () => $('#s-go').classList.remove('go-quiet')));
const cmpHash = location.hash.match(/^#compare=(.+)$/)?.[1];
if (cmpHash) { cmp.push(...decodeURIComponent(cmpHash).split('|').slice(0, 3)); showCompare(cmp, false).then(renderCompareBar); }
const started = decodeStart(location.hash);
// Resume where the visitor left off (only when the link doesn't ask for something else).
const youData = you.load();
if (!location.hash && youData.view) {
  const v = youData.view;
  if (TYPES.includes(v.type)) state.type = v.type;
  state.q = String(v.q || ''); $('#q').value = state.q; state.cap = String(v.cap || ''); state.sort = ['popular', 'new', 'free'].includes(v.sort) ? v.sort : ''; $('#sort').value = state.sort;
  for (const t of TYPES) if (v.f?.[t] && typeof v.f[t] === 'object') state.f[t] = v.f[t];
}
renderSetup();
if (!started && !cmpHash) {
  // Picks come first: returning visitors get their own question again, first visits a sensible default (chat on my computer).
  if (youData.picks && TASKS.includes(youData.picks.task)) { $('#s-task').value = youData.picks.task; $('#s-device').value = youData.picks.device || 'computer'; }
  showPicks(false);
}
if (started) {
  $('#s-task').value = started.task; $('#s-device').value = started.device;
  if (started.mem && !state.mem) { state.mem = started.mem; $('#mem').value = String(started.mem); }
  if (started.country && !state.country) { state.country = started.country; $('#country').value = started.country; }
  syncView();
  showPicks(false);
}
const hashType = location.hash.match(/^#(model|dataset|app|host)$/)?.[1];
await setType(hashType || state.type);
if (prevVisit) await Promise.all([ensureLoaded('model'), ensureLoaded('app')]);
renderYou();
