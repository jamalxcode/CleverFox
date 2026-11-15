// Top picks for "I want to <task> on <device> from <country>". Built only from stated facts
// (memory fit, independent benchmarks, popularity, praise on X, free status, country availability,
// payment without a card); every pick carries the reasons it was picked. No hidden quality score.
import { availableIn, popularity, countryName, fmtNum, CAPS } from './render.js?v=__BUILD__';

const eciOf = (r) => { const b = (r.independent_benchmarks || []).find((x) => x.id === 'epoch_eci' || x.id === 'aa_intelligence'); const n = b ? parseFloat(b.display) : NaN; return Number.isFinite(n) ? { n, id: b.id } : null; };
const pop = (r) => Math.log10(1 + popularity(r));
const famKey = (r) => (r.family || r.name).toLowerCase().replace(/[-_\s.]+/g, ' ').split(' ').slice(0, 2).join(' ');
// Strong general chat models (with an independent benchmark score) also count for text tasks.
const TEXT_TASKS = new Set(['writing', 'translation', 'reasoning', 'math', 'analytics', 'search', 'coding']);
const fitsTask = (r, task) => (r.answers?.good_for || []).includes(task) || (TEXT_TASKS.has(task) && (r.answers?.good_for || []).includes('chat') && !!eciOf(r));
const okModel = (r) => r.warning === 'none' && !r.answers?.uncensored;
function top(list, n = 3) {
  const seen = new Set(); const out = [];
  for (const x of list.sort((a, b) => b.score - a.score)) { const k = x.key; if (seen.has(k)) continue; seen.add(k); out.push(x); if (out.length === n) break; }
  return out;
}
const benchReason = (e) => e && (e.id === 'epoch_eci' ? `🧠 ECI ${e.n} (Epoch AI)` : `🧠 AA index ${e.n}`);
const benchScore = (e) => e ? Math.max(0, (e.n - 100) / 8) : 0;

export function pickModelsLocal(models, { task, mem }) {
  const m = mem || 8;
  const c = models.filter((r) => okModel(r) && r.local_ready && r.hardware && fitsTask(r, task) && r.hardware.min_memory_gb <= m * 0.8);
  return top(c.map((r) => {
    const e = eciOf(r); const need = r.hardware.min_memory_gb;
    const reasons = [`✓ fits ${mem ? `your ${m} GB` : `${m} GB`} (needs ~${need} GB)`, benchReason(e), popularity(r) ? `↓ ${fmtNum(Math.round(popularity(r)))} downloads / pulls` : null, r.answers?.x_praised && '📣 praised on X', r.answers?.free === 'free_download' && '🆓 free download'].filter(Boolean);
    // Using more of the available memory usually means a stronger model.
    const score = benchScore(e) * 1.5 + pop(r) + (r.answers?.x_praised ? 2 : 0) + (need / m) * 2 + (r.verification_status === 'verified' ? 0.5 : 0);
    return { r, score, reasons, key: famKey(r) };
  }));
}

export function pickModelsOnline(models, { task }) {
  const c = models.filter((r) => okModel(r) && r.answers?.online && fitsTask(r, task));
  return top(c.map((r) => {
    const e = eciOf(r); const from = r.online_from;
    const reasons = [from === 0 ? '🆓 free online' : Number.isFinite(from) ? `☁️ from $${from} per million tokens` : '☁️ online through API providers', r.answers.online_no_card && '🪙 a provider takes payment without a card', benchReason(e), `${r.answers.online} provider${r.answers.online > 1 ? 's' : ''}`].filter(Boolean);
    const score = benchScore(e) * 1.5 + pop(r) * 0.6 + (from === 0 ? 2 : 0) + (r.answers.online_no_card ? 1.5 : 0) + Math.min(r.answers.online, 6) * 0.3;
    return { r, score, reasons, key: famKey(r) };
  }));
}

export function pickApps(apps, { task, device, country }) {
  const c = apps.filter((r) => r.warning === 'none' && (r.answers?.good_for || []).includes(task) && availableIn(r.access, country) !== 'no' && (device !== 'phone' || r.on_device || (r.app_store_urls || []).length || r.official_store));
  return top(c.map((r) => {
    const here = country ? availableIn(r.access, country) : 'unknown';
    const local = country && r.publisher_region?.value === country;
    const free = r.answers?.free;
    const reasons = [here === 'yes' && `✓ available in ${countryName(country)}`, local && `🏠 made in ${countryName(country)}`, free === 'free' ? '🆓 free' : free === 'free_tier' ? '🆓 free tier' : null,
      r.answers?.pay_without_card && '🪙 pay without a card', r.access?.local_currency_pricing?.value === true && '💱 local prices', r.official_store?.rating && `⭐ ${r.official_store.rating} on the App Store`, r.on_device && '📱 works offline on your phone', r.answers?.x_praised && '📣 praised on X'].filter(Boolean);
    const score = (here === 'yes' ? 3 : 0) + (local ? 2 : 0) + (free === 'free' ? 2.5 : free === 'free_tier' ? 2 : 0) + (r.answers?.pay_without_card ? 1.5 : 0) + (r.access?.local_currency_pricing?.value === true ? 0.5 : 0) + (r.official_store?.rating ? r.official_store.rating / 2.5 : 0)
      + (device === 'phone' && r.on_device ? 1.5 : 0) + (r.answers?.x_praised ? 1 : 0) + (r.verification_status === 'verified' ? 0.5 : 0) + Math.log10(1 + (r.official_store?.ratings || 0)) * 0.3;
    return { r, score, reasons, key: r.id };
  }));
}

export function pickOffline(apps, { task, country }) {
  const c = apps.filter((r) => r.on_device && r.warning === 'none' && availableIn(r.access, country) !== 'no' && ((r.answers?.good_for || []).includes(task) || task === 'chat' || task === 'writing'));
  return top(c.map((r) => {
    const free = r.answers?.free;
    const reasons = ['📱 runs offline on your phone', free === 'free' ? '🆓 free' : free === 'free_tier' ? '🆓 free tier' : free === 'paid_only' ? 'paid' : null, /github\.com/.test((r.official_urls || []).join(' ')) && '🔓 open source', r.verification_status === 'verified' && '✅ checked at the official source'].filter(Boolean);
    const score = (free === 'free' ? 3 : free === 'free_tier' ? 2 : 0) + ((r.answers?.good_for || []).includes(task) ? 2 : 0) + (r.verification_status === 'verified' ? 1 : 0) + (/github\.com/.test((r.official_urls || []).join(' ')) ? 0.5 : 0);
    return { r, score, reasons, key: r.id };
  }));
}

export const TASKS = Object.keys(CAPS);
// Shareable state: #start=<task>,<device>,<memory>,<country>
export const encodeStart = (s) => `#start=${[s.task, s.device, s.mem || 0, s.country || ''].join(',')}`;
export function decodeStart(hash) {
  const m = String(hash || '').match(/^#start=([a-z]+),(phone|computer|online),(\d+),([A-Z]{0,2})$/);
  return m && TASKS.includes(m[1]) ? { task: m[1], device: m[2], mem: +m[3], country: m[4] } : null;
}
