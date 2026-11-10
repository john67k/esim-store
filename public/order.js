// Renders an order (used after checkout and from "My orders").
function renderOrder(o, root) {
  const pay = o.payment.last4 ? `${o.payment.brand} •••• ${o.payment.last4}` : { apple_pay: 'Apple Pay', google_pay: 'Google Pay', cashapp: 'Cash App ' + (o.payment.cashtag || ''), paypal: 'PayPal', crypto: `${o.payment.amount} ${o.payment.asset}`, stripe_checkout: 'Card (Stripe)' }[o.payment.method] || o.payment.method || 'Payment';
  const copy = (id, val) => `<div class="code"><span id="${id}">${esc(val)}</span><button type="button" class="btn sm light" data-copy="${id}">Copy</button></div>`;
  const waiting = o.status === 'pending_payment' || o.status === 'paid';
  const ready = o.status === 'activated' && o.esim;
  const e = o.esim;
  const qr = `/api/orders/${encodeURIComponent(o.orderNumber)}/qr.svg?token=${encodeURIComponent(o.token)}`;
  const badge = o.status === 'activated' ? 'ok-badge' : o.status === 'paid' ? 'ok-badge' : 'tag y';
  root.innerHTML = `
  <div class="card center"><span class="${badge}" id="statusBadge">${esc(o.statusLabel || o.status)}${o.testMode && o.status !== 'activated' ? ' (test)' : ''}</span>
    <h1 style="margin-top:10px">${ready ? 'Your eSIM is ready' : waiting ? (o.status === 'paid' ? 'We have your order' : 'Waiting for payment') : esc(o.statusLabel || o.status)}</h1>
    <p class="muted">Order <b id="orderNum">${esc(o.orderNumber)}</b> · ${esc(o.email)}</p></div>
  <div class="card"><div class="summary"><div><b>${esc(o.plan.name)}</b><div class="small muted">${esc(dataText(o.plan))} · ${esc(termText(o.plan))} · ${esc(o.plan.network)} plan</div></div><div class="p">${money(o.amountCents)}</div></div>
    <p class="small muted" style="margin:.5em 0 0">${o.status === 'pending_payment' ? 'Payment pending' : 'Paid'} with ${esc(pay)}${o.device ? ` · Phone: ${esc(o.device.model)}` : ''}</p></div>
  ${o.status === 'paid' ? `<div class="note" id="awaitingNote"><b>Paid – awaiting activation.</b> ${esc(CONFIG.activationNote)} We'll update this page when your eSIM is ready. Bookmark it or find it later under My orders.</div>` : ''}
  ${o.status === 'pending_payment' ? '<div class="note warn" id="pendingNote">We have not received your payment yet. If you already paid, wait a moment and refresh this page.</div>' : ''}
  ${ready ? `
  <div class="card qrwrap"><h2>Scan to install</h2><p class="small muted">Open this page on another screen, or use the manual code below if you're on the same phone.</p>
    <img id="qr" src="${qr}" alt="eSIM QR code"></div>
  <div class="card"><h2>Manual activation code</h2><p class="small muted">Use this if you can't scan the QR code.</p>
    <label>SM-DP+ address</label>${copy('smdp', e.smdpAddress)}<label>Activation code</label>${copy('acode', e.activationCode)}
    <label>Full code (LPA format)</label>${copy('lpa', e.lpa)}
    ${e.iccid ? `<p class="small muted">ICCID: ${esc(e.iccid)}</p>` : ''}${e.phoneNumber ? `<p class="small muted">Phone number: ${esc(e.phoneNumber)}</p>` : ''}</div>
  <div class="card"><h2>How to install</h2><div class="tabs"><button type="button" class="on" data-tab="ios">iPhone</button><button type="button" data-tab="android">Android</button></div>
    <ol class="steps" data-tabpane="ios"><li>Connect to Wi-Fi.</li><li>Open <b>Settings › Cellular</b> (or Mobile Service) › <b>Add eSIM</b>.</li><li>Tap <b>Use QR Code</b> and scan the code above. On the same phone, tap <b>Enter Details Manually</b> and paste the SM-DP+ address and activation code.</li><li>Label the line (e.g. "Prepaid") and pick it for cellular data.</li><li>Restart your phone if you don't see signal within a few minutes.</li></ol>
    <ol class="steps" data-tabpane="android" hidden><li>Connect to Wi-Fi.</li><li>Pixel: <b>Settings › Network & internet › SIMs › Add SIM › Download a SIM instead</b>. Samsung: <b>Settings › Connections › SIM manager › Add eSIM › Scan QR code</b>.</li><li>Scan the code above, or tap <b>Enter code manually</b> and paste the full LPA code.</li><li>Turn the new eSIM on and choose it for mobile data, calls and texts.</li><li>Restart your phone if you don't see signal within a few minutes.</li></ol>
    <p class="small muted">Don't delete the eSIM from your phone. Most eSIM codes work only once.</p></div>` : ''}
  ${o.port ? `<div class="card" id="portCard"><h2>Number transfer</h2><div class="kv"><b>Number</b><span>${esc(o.port.phone)}</span><b>From</b><span>${esc(o.port.carrier)}</span><b>Account</b><span>•••• ${esc(o.port.accountLast4)}</span><b>Transfer PIN</b><span>Received (hidden for your security)</span><b>Status</b><span>${esc(o.port.status)}</span></div>
    <p class="small muted">Keep your old service active until the transfer finishes. It usually takes from a few minutes to 24 hours.</p></div>` : ''}
  <p class="small muted center">${esc(CONFIG.disclaimer)}</p>
  <p><a class="btn light block" href="/">Back to plans</a></p>`;
  $$('[data-tab]', root).forEach((b) => (b.onclick = () => { $$('[data-tab]', root).forEach((x) => x.classList.toggle('on', x === b)); $$('[data-tabpane]', root).forEach((p) => (p.hidden = p.dataset.tabpane !== b.dataset.tab)); }));
  $$('[data-copy]', root).forEach((b) => (b.onclick = async () => { try { await navigator.clipboard.writeText($('#' + b.dataset.copy).textContent); b.textContent = 'Copied'; } catch { b.textContent = 'Select & copy'; } }));
}
if ($('#order') && qs('n')) (async () => {
  await ready;
  try { renderOrder(await api(`/api/orders/${encodeURIComponent(qs('n') || '')}?token=${encodeURIComponent(qs('t') || '')}`), $('#order')); }
  catch { $('#order').innerHTML = '<div class="card">We couldn\'t find that order. Try <a href="/orders">My orders</a>.</div>'; }
})();
