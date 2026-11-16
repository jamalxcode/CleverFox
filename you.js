// "Your CleverFox": what a visitor saves and has looked at, kept only in this browser (localStorage key "cf_you").
// Nothing is sent anywhere. It can be downloaded, loaded on another device and cleared at any time.
// Used by app.js (main page) and by every listing page (Save button, recently viewed).
const KEY = 'cf_you';
const MAX_RECENT = 20;
const blank = () => ({ v: 1, saved: [], recent: [], last_visit: null, prev_visit: null, picks: null, remind: 'off', view: null });

export function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && d.v === 1 ? { ...blank(), ...d } : blank(); } catch { return blank(); }
}
function write(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* storage unavailable: features still work for this visit */ } return d; }
export function update(fn) { const d = load(); fn(d); return write(d); }

const brief = (r, path) => ({ id: r.id, name: r.name, type: r.type, publisher: r.publisher_name || r.publisher || '', path, at: new Date().toISOString() });
export const isSaved = (id) => load().saved.some((s) => s.id === id);
export function toggleSave(r, path) {
  let on = false;
  update((d) => { const i = d.saved.findIndex((s) => s.id === r.id); if (i >= 0) d.saved.splice(i, 1); else { d.saved.unshift(brief(r, path)); on = true; } });
  return on;
}
export function addRecent(r, path) {
  update((d) => { d.recent = [brief(r, path), ...d.recent.filter((s) => s.id !== r.id)].slice(0, MAX_RECENT); });
}
// Visits: "since your last visit" compares with the visit before this one (a visit = a day with the page open).
export function markVisit(now = new Date()) {
  const d = load(); const today = now.toISOString().slice(0, 10);
  if (d.last_visit?.slice(0, 10) !== today) { d.prev_visit = d.last_visit; d.last_visit = now.toISOString(); write(d); }
  return d.prev_visit;
}

// The visitor's data as a file, and back.
export function exportFile() {
  const blob = new Blob([JSON.stringify(load(), null, 1)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'cleverfox-my-data.json' });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function importText(text) {
  const d = JSON.parse(text);
  if (!d || d.v !== 1 || !Array.isArray(d.saved)) throw new Error('This is not a CleverFox data file.');
  return write({ ...blank(), ...d });
}
export function clearAll() { try { localStorage.removeItem(KEY); } catch {} }

// A calendar reminder (.ics) the visitor adds to their own calendar: weekly or monthly, removable there at any time.
export function reminderFile(freq, url, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const day = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  const rule = freq === 'monthly' ? 'FREQ=MONTHLY' : 'FREQ=WEEKLY';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CleverFox//Reminder//EN', 'BEGIN:VEVENT', `UID:cleverfox-${stamp}@cleverfox`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day}`, `RRULE:${rule}`, 'SUMMARY:CleverFox: new AI you can use', `DESCRIPTION:See what's new for your device and country: ${url}`, `URL:${url}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), download: `cleverfox-${freq}-reminder.ics` });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Listing pages: a Save button and the visit recorded in "recently viewed".
export function wireListingPage(r, path, root = document) {
  addRecent(r, path);
  const b = root.querySelector('[data-act="save"]'); if (!b) return;
  const label = () => { const on = isSaved(r.id); b.textContent = on ? '★ Saved' : '☆ Save'; b.setAttribute('aria-pressed', String(on)); };
  b.hidden = false; label();
  b.addEventListener('click', () => { toggleSave(r, path); label(); });
}
