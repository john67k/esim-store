(async () => {
  await ready;
  let p;
  try { p = await api('/api/plans/' + encodeURIComponent(qs('id') || '')); }
  catch { $('#plan').innerHTML = '<div class="card">That plan is no longer available. <a href="/">See all plans</a></div>'; return; }
  document.title = `${p.name} · ${CONFIG.storeName}`;
  $('#plan').innerHTML = `<div class="two"><div class="card"><div class="muted small" style="font-weight:700;text-transform:uppercase">${esc(p.network)} plan</div>
    <h1>${esc(p.name)}</h1>${planTags(p)}<div style="font-size:2.2rem;font-weight:800;margin:10px 0">${money(p.priceCents)} <span class="muted" style="font-size:1rem;font-weight:500">for ${esc(termText(p))}${esc(perMonth(p))}</span></div>
    <div class="kv" id="details"><b>Data</b><span>${esc(dataText(p))}</span><b>Network speed</b><span>${p.fiveG ? '5G where available, 4G LTE elsewhere' : '4G LTE'}</span>
    <b>Talk</b><span>${esc(p.talk)}</span><b>Text</b><span>${esc(p.text)}</span>
    <b>Valid for</b><span>${esc(termText(p))} (${esc(p.validityDays)} days) from activation</span><b>Network</b><span>${esc(p.network)} (AT&amp;T network)</span><b>Delivery</b><span>eSIM. ${esc(CONFIG.activationNote)}</span></div>
    ${p.notes ? `<p class="small">${esc(p.notes)}</p>` : ''}
    ${p.example ? '<p class="note warn">Example plan and price for this demo store. Not a real carrier offer.</p>' : ''}
    <p><a class="btn block" id="buy" href="/checkout?plan=${encodeURIComponent(p.id)}">Buy for ${money(p.priceCents)}</a></p></div>
    <div class="card"><h2>Will it work on my phone?</h2><p class="small muted">Pick your phone to check eSIM support.</p><div id="compat"></div></div></div>
    <div class="card"><h2>How it works</h2><ol class="steps"><li>Buy the plan. You can keep your current number.</li><li>We activate your Airvoice line after we confirm your order.</li><li>Open your order page, scan the eSIM QR code in your phone's settings, and you're connected.</li></ol>
    <p class="small muted">${esc(CONFIG.storeName)} is an independent seller, not Airvoice Wireless.</p></div>`;
  compatWidget($('#compat'));
})();
