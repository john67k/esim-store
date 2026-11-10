// Shared layout + helpers. The store name comes from config.js on the server (one value to rename).
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (c) => '$' + (c / 100).toFixed(2);
const qs = (k) => new URLSearchParams(location.search).get(k);
async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, body: opts.body && JSON.stringify(opts.body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || 'Something went wrong'), { status: r.status });
  return data;
}
const dataText = (p) => p.unlimited ? 'Unlimited' + (p.dataGB ? ` (${p.dataGB}GB high-speed)` : '') : `${p.dataGB}GB`;
function planSpecs(p) {
  return `<ul class="specs"><li><b>Data</b>${esc(dataText(p))}</li><li><b>Talk / text</b>${esc(p.talk)} / ${esc(p.text)}</li>
  <li><b>Hotspot</b>${p.hotspotGB ? esc(p.hotspotGB) + 'GB' : 'Not included'}</li><li><b>Valid for</b>${esc(p.validityDays)} days</li></ul>`;
}
function planTags(p) {
  return `<div class="tags">${p.fiveG ? '<span class="tag">5G</span>' : '<span class="tag">4G LTE</span>'}${p.unlimited ? '<span class="tag g">Unlimited</span>' : ''}${p.example ? '<span class="tag y">Example plan &amp; price</span>' : ''}</div>`;
}
function planCard(p) {
  return `<div class="plan" data-plan="${esc(p.id)}"><div class="net">Runs on ${esc(p.network)}</div><h3>${esc(p.name)}</h3>${planTags(p)}
  <div class="price">${money(p.priceCents)} <small>/ ${esc(p.validityDays)} days</small></div>${planSpecs(p)}
  <div class="acts"><a class="btn light" href="/plan?id=${encodeURIComponent(p.id)}">Details</a><a class="btn" href="/checkout?plan=${encodeURIComponent(p.id)}">Buy</a></div></div>`;
}
let CONFIG = null;
const ready = (async () => {
  CONFIG = await api('/api/config');
  document.title = document.title.replace('{store}', CONFIG.storeName);
  const here = location.pathname.replace(/\.html$/, '');
  const link = (h, t) => `<a href="${h}" class="${here === h ? 'on' : ''}">${t}</a>`;
  document.body.insertAdjacentHTML('afterbegin', `${CONFIG.testMode ? '<div class="testbar" id="testbar"><b>TEST MODE</b> · Example plans and prices. Payments are simulated and eSIMs are samples that won\'t activate.</div>' : ''}
  <header class="top"><div class="in"><a class="brand" href="/"><i>${esc(CONFIG.storeName[0] || 'S')}</i><span class="storename">${esc(CONFIG.storeName)}</span></a>
  <nav>${link('/', 'Plans')}${link('/compatibility', 'Check phone')}${link('/orders', 'My orders')}</nav></div></header>`);
  document.body.insertAdjacentHTML('beforeend', `<footer><p id="disclaimer"><b>${esc(CONFIG.disclaimer)}</b></p>
  <p>${esc(CONFIG.storeName)} sells prepaid plans delivered as eSIM. Your phone must support eSIM and be carrier-unlocked. Questions: ${esc(CONFIG.supportEmail)}</p>
  <p>© ${new Date().getFullYear()} ${esc(CONFIG.storeName)} · <a href="/admin">Owner login</a></p></footer>`);
  $$('.storename-inline').forEach((el) => (el.textContent = CONFIG.storeName));
  return CONFIG;
})();

// Device compatibility widget (used on /compatibility and /checkout)
let DEVICES = null;
async function compatWidget(root, onChange) {
  DEVICES ||= await api('/api/devices');
  const brands = [...new Set(DEVICES.map((d) => d.brand))];
  root.innerHTML = `<div class="row"><div><label for="cBrand">Phone brand</label><select id="cBrand"><option value="">Choose…</option>${brands.map((b) => `<option>${esc(b)}</option>`).join('')}<option value="other">Other</option></select></div>
  <div><label for="cModel">Model</label><select id="cModel" disabled><option value="">Choose brand first</option></select></div></div><div id="cResult"></div>`;
  const brand = $('#cBrand', root), model = $('#cModel', root), out = $('#cResult', root);
  const unlocked = '<p class="small" style="margin:.5em 0 0">Also make sure your phone is <b>carrier-unlocked</b>. A phone locked to another carrier can\'t use a new eSIM. Ask your current carrier to unlock it, or look in Settings.</p>';
  const show = () => {
    const d = DEVICES.find((x) => x.id === model.value);
    if (brand.value === 'other') { out.innerHTML = `<div class="note warn" data-esim="unknown">Not on our list. On iPhone go to Settings › Cellular and look for "Add eSIM". On Android go to Settings › Network (or Connections) › SIM and look for "Add eSIM" or "Download a SIM".${unlocked}</div>`; onChange?.(null); return; }
    if (!d) { out.innerHTML = ''; onChange?.(null); return; }
    const cls = { yes: 'ok', limited: 'warn', no: 'err' }[d.esim];
    const msg = { yes: `✅ Good news: the ${esc(d.model)} supports eSIM.`, limited: `⚠️ The ${esc(d.model)} may support eSIM.`, no: `❌ The ${esc(d.model)} does not support eSIM, so these plans won't work on it.` }[d.esim];
    out.innerHTML = `<div class="note ${cls}" data-esim="${d.esim}"><b>${msg}</b>${d.note ? `<div class="small">${esc(d.note)}</div>` : ''}${d.esim !== 'no' ? unlocked : ''}</div>`;
    onChange?.(d);
  };
  brand.onchange = () => {
    const list = DEVICES.filter((d) => d.brand === brand.value);
    model.disabled = !list.length;
    model.innerHTML = list.length ? '<option value="">Choose model…</option>' + list.map((d) => `<option value="${d.id}">${esc(d.model)}</option>`).join('') : '<option value="">—</option>';
    show();
  };
  model.onchange = show;
}
