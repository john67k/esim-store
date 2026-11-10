(async () => {
  await ready;
  let p;
  try { p = await api('/api/plans/' + encodeURIComponent(qs('id') || '')); }
  catch { $('#plan').innerHTML = '<div class="card">That plan is no longer available. <a href="/">See all plans</a></div>'; return; }
  document.title = `${p.name} · ${CONFIG.storeName}`;
  $('#plan').innerHTML = `<div class="two"><div class="card"><div class="muted small" style="font-weight:700;text-transform:uppercase">Runs on ${esc(p.network)}</div>
    <h1>${esc(p.name)}</h1>${planTags(p)}<div style="font-size:2.2rem;font-weight:800;margin:10px 0">${money(p.priceCents)} <span class="muted" style="font-size:1rem;font-weight:500">for ${esc(p.validityDays)} days</span></div>
    <div class="kv" id="details"><b>Data</b><span>${esc(dataText(p))}</span><b>Network speed</b><span>${p.fiveG ? '5G where available, 4G LTE elsewhere' : '4G LTE'}</span>
    <b>Talk</b><span>${esc(p.talk)}</span><b>Text</b><span>${esc(p.text)}</span><b>Hotspot</b><span>${p.hotspotGB ? esc(p.hotspotGB) + 'GB' : 'Not included'}</span>
    <b>Valid for</b><span>${esc(p.validityDays)} days from activation</span><b>Network</b><span>${esc(p.network)}</span><b>Delivery</b><span>eSIM QR code on screen right after checkout</span></div>
    ${p.notes ? `<p class="small">${esc(p.notes)}</p>` : ''}
    ${p.example ? '<p class="note warn">Example plan and price for this demo store. Not a real carrier offer.</p>' : ''}
    <p><a class="btn block" id="buy" href="/checkout?plan=${encodeURIComponent(p.id)}">Buy for ${money(p.priceCents)}</a></p></div>
    <div class="card"><h2>Will it work on my phone?</h2><p class="small muted">Pick your phone to check eSIM support.</p><div id="compat"></div></div></div>
    <div class="card"><h2>How it works</h2><ol class="steps"><li>Buy the plan. You can keep your current number.</li><li>Get your eSIM QR code right away.</li><li>Scan it in your phone's settings and you're connected.</li></ol></div>`;
  compatWidget($('#compat'));
})();
