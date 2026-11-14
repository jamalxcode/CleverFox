// CleverFox report form: sends a community report to the site's ntfy.sh channel.
// The private cleverfox-reports repo collects the channel every hour and checks each report.
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } } };
const flag = (c) => String.fromCodePoint(...[...c].map((x) => 0x1f1a5 + x.charCodeAt(0)));
const TYPE_LABELS = { model: 'Models', app: 'Apps', host: 'Hosting' };
const MAX_SIDE = 1600;

const [cfg, catalog] = await Promise.all([
  fetch('../report.json?t=' + Date.now()).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  fetch('../data/catalog.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
]);
if (!cfg.ntfy_topic || !catalog) { $('#off').hidden = false; throw new Error('reports off'); }
$('#form').hidden = false;

// ---- fill the selects ----
const params = new URLSearchParams(location.search);
$('#listing').insertAdjacentHTML('beforeend', ['app', 'host', 'model'].map((t) => {
  const recs = catalog.records.filter((r) => r.type === t).sort((a, b) => a.name.localeCompare(b.name));
  return `<optgroup label="${TYPE_LABELS[t]}">${recs.map((r) => `<option value="${esc(r.id)}">${esc(r.name)} (${esc(r.publisher)})</option>`).join('')}</optgroup>`;
}).join(''));
if (params.get('id')) $('#listing').value = params.get('id');
$('#country').insertAdjacentHTML('beforeend', catalog.countries.map(([c, n]) => `<option value="${c}">${flag(c)} ${esc(n)}</option>`).join(''));
const savedCountry = store.get('country');
if (savedCountry) $('#country').value = savedCountry;
const today = new Date().toISOString().slice(0, 10);
$('#date').value = today;
$('#date').max = today;

// ---- show the right fields ----
const kind = () => document.querySelector('input[name="kind"]:checked').value;
function sync() {
  const k = kind();
  $('#access-fields').hidden = k !== 'access';
  $('#warning-fields').hidden = k !== 'warning';
  const f = $('#fact').value;
  $('#method-field').hidden = !(k === 'access' && (f === 'paid_with' || f === 'payment_refused'));
}
if (params.get('kind') === 'warning') document.querySelector('input[value="warning"]').checked = true;
document.querySelectorAll('input[name="kind"]').forEach((el) => el.addEventListener('change', sync));
$('#fact').addEventListener('change', sync);
sync();

// ---- screenshot with black-out boxes ----
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
let img = null;
let boxes = [];
let drag = null;
function draw() {
  if (!img) return;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  for (const b of [...boxes, ...(drag ? [drag] : [])]) ctx.fillRect(b.x, b.y, b.w, b.h);
}
function point(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
}
canvas.addEventListener('pointerdown', (e) => { if (!img) return; canvas.setPointerCapture(e.pointerId); const p = point(e); drag = { x0: p.x, y0: p.y, x: p.x, y: p.y, w: 0, h: 0 }; });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = point(e);
  Object.assign(drag, { x: Math.min(drag.x0, p.x), y: Math.min(drag.y0, p.y), w: Math.abs(p.x - drag.x0), h: Math.abs(p.y - drag.y0) });
  draw();
});
canvas.addEventListener('pointerup', () => { if (drag && drag.w > 3 && drag.h > 3) boxes.push(drag); drag = null; draw(); });
$('#undo').addEventListener('click', () => { boxes.pop(); draw(); });
function clearImage() { img = null; boxes = []; $('#file').value = ''; $('#redact').hidden = true; $('#consent').checked = false; }
$('#clear-img').addEventListener('click', clearImage);
$('#file').addEventListener('change', async () => {
  const f = $('#file').files[0];
  if (!f) return clearImage();
  if (!f.type.startsWith('image/')) { showError('Please choose an image file.'); return clearImage(); }
  try {
    const bmp = await createImageBitmap(f);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    img = bmp; boxes = [];
    $('#redact').hidden = false;
    draw();
  } catch { showError('That image could not be opened. Try a PNG or JPEG.'); clearImage(); }
});

// ---- send ----
function showError(msg) { $('#error').textContent = msg; $('#error').hidden = !msg; }
$('#form').addEventListener('input', () => showError(''));
// ntfy reads the message from a header when a file is attached, and headers must be ASCII,
// so non-ASCII characters are written as JSON \u escapes (still valid JSON).
const asciiJson = (o) => JSON.stringify(o).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  const k = kind();
  const report = { v: 1, kind: k, listing: $('#listing').value, note: $('#note').value.trim().slice(0, 500), link: $('#link').value.trim(), has_image: !!img };
  if (!report.listing) return showError('Choose the listing this is about.');
  if (k === 'access') {
    Object.assign(report, { fact: $('#fact').value, country: $('#country').value, date: $('#date').value });
    if (!$('#method-field').hidden) report.method = $('#method').value;
    if (!report.country) return showError('Choose the country.');
    if (!report.date || report.date > today) return showError('Choose the date it happened (not in the future).');
    if (!$('#method-field').hidden && !report.method) return showError('Choose the payment method.');
    if (report.method === 'other' && report.note.length < 3) return showError('Name the payment method in Details.');
    if (['free_tier', 'signup'].includes(report.fact) && report.note.length < 10) return showError('Describe it in Details.');
  } else {
    report.reason = $('#reason').value;
    if (report.note.length < 20) return showError('Describe the problem in Details (at least a sentence).');
  }
  if (report.link && !/^https?:\/\/[^\s]+\.[^\s]+/.test(report.link)) return showError('The link should start with https://');
  if (!report.link && !img) return showError('Add evidence: a public link or a screenshot.');
  if (img && !$('#consent').checked) return showError('Confirm you hid personal details in the screenshot.');

  $('#send').disabled = true;
  $('#send').textContent = 'Sending…';
  try {
    const url = `https://ntfy.sh/${encodeURIComponent(cfg.ntfy_topic)}`;
    let res;
    if (img) {
      draw();
      const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82));
      res = await fetch(url, { method: 'PUT', body: blob, headers: { Filename: 'evidence.jpg', Title: 'CleverFox report', Message: asciiJson(report) } });
    } else {
      res = await fetch(url, { method: 'POST', body: JSON.stringify(report), headers: { Title: 'CleverFox report' } });
    }
    if (!res.ok) throw new Error(String(res.status));
    $('#form').hidden = true;
    $('#done').hidden = false;
    window.goatcounter?.count?.({ path: 'report-sent', title: 'Report sent', event: true });
  } catch (err) {
    showError(err.message === '429' ? 'Too many reports from your connection right now. Try again in a few minutes.' : 'Sending failed. Check your connection and try again.');
    $('#send').disabled = false;
    $('#send').textContent = 'Send report';
  }
});
