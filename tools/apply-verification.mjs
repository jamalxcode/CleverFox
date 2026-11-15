// Applies a verification review to the seed records, after checking every quote against the fetched pages.
// A listing with any quote that isn't on its page is rejected whole (nothing changes for it).
// Review files: arrays of { id, file, verdict, confirmed: [{field, url, quote}], set: {path: value},
// set_quotes: {path: {url, quote}}, unconfirmed: [paths], notes }.
//
// Usage: node tools/apply-verification.mjs --pages <pages-cache dir> --date 2026-11-16 <review.json>...
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const norm = (s) => String(s || '').normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

export function pageTexts(pagesDir, id) {
  const idx = JSON.parse(readFileSync(join(pagesDir, 'index.json'), 'utf8')).index[id];
  const out = new Map();
  for (const p of idx?.pages || []) if (p.file && existsSync(join(pagesDir, p.file))) out.set(p.url, norm(readFileSync(join(pagesDir, p.file), 'utf8')));
  return out;
}
// A quote counts if it appears on the named page (or, failing that, on any of the listing's fetched pages).
export function quoteOk(texts, url, quote) {
  const q = norm(quote);
  if (q.length < 6) return false;
  if (texts.get(url)?.includes(q)) return true;
  return [...texts.values()].some((t) => t.includes(q));
}
function setPath(obj, path, value) {
  const keys = path.split('.'); let o = obj;
  for (const k of keys.slice(0, -1)) o = (o[k] ??= {});
  o[keys.at(-1)] = value;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pagesDir = arg('--pages'); const date = arg('--date', new Date().toISOString().slice(0, 10));
  const files = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !['--pages', '--date', '--report'].includes(all[i - 1]));
  const reviews = files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')));
  const seeds = new Map();
  const load = (f) => { if (!seeds.has(f)) seeds.set(f, JSON.parse(readFileSync(join(root, 'data', 'seed', f), 'utf8'))); return seeds.get(f); };
  const report = { verified: [], candidate: [], rejected: [], corrections: 0 };
  for (const rv of reviews) {
    const texts = pageTexts(pagesDir, rv.id);
    const quotes = [...(rv.confirmed || []).map((c) => [c.field, c.url, c.quote]), ...Object.entries(rv.set_quotes || {}).map(([p, q]) => [p, q.url, q.quote])];
    const missingQuote = Object.keys(rv.set || {}).filter((p) => !rv.set_quotes?.[p]);
    const bad = quotes.filter(([, url, q]) => !quoteOk(texts, url, q));
    if (bad.length || missingQuote.length) { report.rejected.push({ id: rv.id, bad: bad.map(([f, , q]) => `${f}: "${String(q).slice(0, 60)}"`), missing_quotes: missingQuote }); continue; }
    const list = load(rv.file); const rec = list.find((r) => r.id === rv.id);
    if (!rec) { report.rejected.push({ id: rv.id, bad: [`not found in ${rv.file}`] }); continue; }
    for (const [p, v] of Object.entries(rv.set || {})) { setPath(rec, p, v); report.corrections++; }
    const used = [...new Set(quotes.map(([, u]) => u))];
    const summary = `Verification review ${date}: compared with the official pages fetched that day (${used.length} page${used.length === 1 ? '' : 's'}); ${quotes.length} quoted confirmations${Object.keys(rv.set || {}).length ? `, corrected or added: ${Object.keys(rv.set).join(', ')}` : ''}${rv.unconfirmed?.length ? `; not found on the pages: ${rv.unconfirmed.join(', ')}` : ''}. ${rv.notes || ''}`.trim();
    rec.research_notes = `${rec.research_notes ? rec.research_notes + ' ' : ''}${summary}`;
    if (rv.verdict === 'verified') { rec.verification_status = 'verified'; rec.verified_by = `official pages read, ${date}`; report.verified.push(rv.id); }
    else report.candidate.push({ id: rv.id, unconfirmed: rv.unconfirmed || [] });
  }
  for (const [f, list] of seeds) writeFileSync(join(root, 'data', 'seed', f), JSON.stringify(list, null, 1) + '\n');
  console.log(JSON.stringify({ verified: report.verified.length, candidate: report.candidate.length, rejected: report.rejected.length, corrections: report.corrections }, null, 1));
  if (report.rejected.length) console.log('Rejected:\n' + report.rejected.map((r) => `- ${r.id}: ${[...(r.bad || []), ...(r.missing_quotes || []).map((p) => `no quote for ${p}`)].join('; ')}`).join('\n'));
  writeFileSync(arg('--report', '/dev/null'), JSON.stringify(report, null, 1));
}
