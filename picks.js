// Top picks for "I want to <task> on <device> from <country>". Built only from stated facts
// (memory fit, independent benchmarks, popularity, praise on X, free status, country availability,
// payment without a card); every pick carries the reasons it was picked. No hidden quality score.
import { availableIn, popularity, countryName, fmtNum, CAPS, speaks, langName, playNoCard, shortPay, payNoCard } from './render.js?v=__BUILD__';
const langReason = (r, l) => speaks(r, l) ? `🗣️ ${langName(l)}` : null;
const langBonus = (r, l) => speaks(r, l) ? 3 : 0;

const eciOf = (r) => { const b = (r.independent_benchmarks || []).find((x) => x.id === 'epoch_eci' || x.id === 'aa_intelligence'); const n = b ? parseFloat(b.display) : NaN; return Number.isFinite(n) ? { n, id: b.id } : null; };
const pop = (r) => Math.log10(1 + popularity(r));
const famKey = (r) => (r.family || r.name).toLowerCase().replace(/[-_\s.]+/g, ' ').split(' ').slice(0, 2).join(' ');
// Only listings that themselves claim the task count for it.
const fitsTask = (r, task) => (r.answers?.good_for || []).includes(task);
const isEst = (r) => r.hardware?.estimate ?? (r.hardware?.options?.length && r.hardware.options.every((o) => /^parameter/i.test(o.basis || '')));
// How picks are ordered, shown on the page (keep in step with the scores below).
export const ORDERING = {
  local: 'Run it yourself: models that claim the task and fit your memory (rough estimates need twice the room), ordered by independent benchmark score, then downloads, then how much of your memory they use.',
  offline: 'Offline on your phone: checked apps that run models on the phone, free ones first.',
  apps: 'Apps: checked apps that claim the task and aren\'t unavailable in your country, ordered by available in your country, made there, free, pay without a card, App Store rating and your language.',
  online: 'Use it online: models that claim the task with API providers, ordered by independent benchmark score, free online, a provider that takes payment without a card, then popularity.',
  not: 'Not considered: praise on X (until its word rules are tested), and unchecked (candidate) apps and hosts.',
};
const okModel = (r) => r.warning === 'none' && !r.answers?.uncensored;
function top(list, n = 3) {
  const seen = new Set(); const out = [];
  for (const x of list.sort((a, b) => b.score - a.score)) { const k = x.key; if (seen.has(k)) continue; seen.add(k); out.push(x); if (out.length === n) break; }
  return out;
}
const benchReason = (e) => e ? (e.id === 'epoch_eci' ? `🧠 ECI ${e.n} (Epoch AI)` : `🧠 AA index ${e.n}`) : '📊 no independent score yet';
const benchScore = (e) => e ? Math.max(0, (e.n - 100) / 8) : 0;

export function pickModelsLocal(models, { task, mem, ulang }) {
  const m = mem || 8;
  // Figures from the download size must fit in 80% of memory; rough estimates from the parameter count in 50%.
  const c = models.filter((r) => okModel(r) && r.local_ready && r.hardware && fitsTask(r, task) && r.hardware.min_memory_gb <= m * (isEst(r) ? 0.5 : 0.8));
  return top(c.map((r) => {
    const e = eciOf(r); const need = r.hardware.min_memory_gb;
    const reasons = [isEst(r) ? `≈ needs about ${need} GB (rough estimate from its size)` : `✓ fits ${mem ? `your ${m} GB` : `${m} GB`} (needs ~${need} GB)`, benchReason(e), popularity(r) ? `↓ ${fmtNum(Math.round(popularity(r)))} downloads / pulls` : null, r.answers?.free === 'free_download' && '🆓 free download', langReason(r, ulang)].filter(Boolean);
    // Using more of the available memory usually means a stronger model (not counted for rough estimates).
    const score = benchScore(e) * 1.5 + pop(r) + (isEst(r) ? 0 : (need / m) * 2) + langBonus(r, ulang);
    return { r, score, reasons, key: famKey(r) };
  }));
}

export function pickModelsOnline(models, { task, ulang }) {
  const c = models.filter((r) => okModel(r) && r.answers?.online && fitsTask(r, task));
  return top(c.map((r) => {
    const e = eciOf(r); const from = r.online_from;
    const reasons = [from === 0 ? '🆓 free online' : Number.isFinite(from) ? `☁️ from $${from} per million tokens` : '☁️ online through API providers', r.answers.online_no_card && '🪙 a provider takes payment without a card', benchReason(e), `${r.answers.online} provider${r.answers.online > 1 ? 's' : ''}`, langReason(r, ulang)].filter(Boolean);
    const score = benchScore(e) * 1.5 + pop(r) * 0.6 + (from === 0 ? 2 : 0) + (r.answers.online_no_card ? 1.5 : 0) + Math.min(r.answers.online, 6) * 0.3 + langBonus(r, ulang);
    return { r, score, reasons, key: famKey(r) };
  }));
}

export function pickApps(apps, { task, device, country, ulang }) {
  const c = apps.filter((r) => r.verification_status === 'verified' && r.warning === 'none' && !r.possibly_discontinued && (r.answers?.good_for || []).includes(task) && availableIn(r.access, country) !== 'no' && (device !== 'phone' || r.on_device || (r.app_store_urls || []).length || r.official_store));
  return top(c.map((r) => {
    const here = country ? availableIn(r.access, country) : 'unknown';
    const local = country && r.publisher_region?.value === country;
    const free = r.answers?.free;
    const reasons = [here === 'yes' && `✓ available in ${countryName(country)}`, local && `🏠 made in ${countryName(country)}`, free === 'free' ? '🆓 free' : free === 'free_tier' ? '🆓 free tier' : null,
      payNoCard(r.access, country) ? '🪙 pay without a card' : (playNoCard(r, country)[0] && `🪙 via Google Play: ${[...new Set(playNoCard(r, country).map(shortPay))].slice(0, 2).join(', ')}`), r.access?.local_currency_pricing?.value === true && '💱 local prices', r.official_store?.rating && `⭐ ${r.official_store.rating} on the App Store`, r.on_device && '📱 works offline on your phone', langReason(r, ulang)].filter(Boolean);
    const score = (here === 'yes' ? 3 : 0) + (local ? 2 : 0) + (free === 'free' ? 2.5 : free === 'free_tier' ? 2 : 0) + (payNoCard(r.access, country) || playNoCard(r, country).length ? 1.5 : 0) + (r.access?.local_currency_pricing?.value === true ? 0.5 : 0) + (r.official_store?.rating ? r.official_store.rating / 2.5 : 0)
      + (device === 'phone' && r.on_device ? 1.5 : 0) + Math.log10(1 + (r.official_store?.ratings || 0)) * 0.3 + langBonus(r, ulang);
    return { r, score, reasons, key: r.id };
  }));
}

export function pickOffline(apps, { task, country }) {
  const c = apps.filter((r) => r.on_device && r.verification_status === 'verified' && r.warning === 'none' && !r.possibly_discontinued && availableIn(r.access, country) !== 'no' && (r.answers?.good_for || []).includes(task));
  return top(c.map((r) => {
    const free = r.answers?.free;
    const reasons = ['📱 runs offline on your phone', free === 'free' ? '🆓 free' : free === 'free_tier' ? '🆓 free tier' : free === 'paid_only' ? 'paid' : null, /github\.com/.test((r.official_urls || []).join(' ')) && '🔓 open source'].filter(Boolean);
    const score = (free === 'free' ? 3 : free === 'free_tier' ? 2 : 0) + (/github\.com/.test((r.official_urls || []).join(' ')) ? 0.5 : 0);
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
