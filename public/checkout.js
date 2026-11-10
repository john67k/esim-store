(async () => {
  await ready;
  const plans = await api('/api/plans');
  let plan = plans.find((p) => p.id === qs('plan')) || plans[0], method = 'card', device = null;
  $('#planSel').innerHTML = plans.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.network)} · ${money(p.priceCents)}</option>`).join('');
  const showPlan = () => {
    $('#planSel').value = plan.id;
    $('#planInfo').innerHTML = `${esc(dataText(plan))} · ${esc(plan.validityDays)} days · runs on ${esc(plan.network)}${plan.example ? '<br><span class="tag y">Example plan &amp; price</span>' : ''}`;
    $('#planPrice').textContent = money(plan.priceCents);
    $('#payBtn').textContent = `Pay ${money(plan.priceCents)}`;
    const r = CONFIG.cryptoRates[$('#asset').value]; if (r) $('#cryptoAmt').textContent = `≈ ${(plan.priceCents / 100 / r).toFixed($('#asset').value === 'BTC' ? 8 : 2)} ${$('#asset').value} (test rate)`;
  };
  $('#planSel').onchange = () => { plan = plans.find((p) => p.id === $('#planSel').value); showPlan(); };
  $('#asset').onchange = showPlan; showPlan();
  compatWidget($('#compat'), (d) => (device = d));
  $('#form').addEventListener('input', () => { $('#formErr').hidden = true; });
  $('#portOn').onchange = () => ($('#portFields').hidden = !$('#portOn').checked);

  $$('#methods button').forEach((b) => (b.onclick = () => {
    method = b.dataset.m; $$('#methods button').forEach((x) => x.classList.toggle('on', x === b));
    $$('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== method));
  }));
  // card formatting + Luhn hint
  const digits = (s) => s.replace(/\D/g, '');
  const luhn = (n) => { if (n.length < 12) return false; let s = 0, d = false; for (let i = n.length - 1; i >= 0; i--) { let x = +n[i]; if (d) { x *= 2; if (x > 9) x -= 9; } s += x; d = !d; } return s % 10 === 0; };
  $('#ccNum').addEventListener('input', (e) => { const n = digits(e.target.value).slice(0, 19); e.target.value = n.replace(/(.{4})/g, '$1 ').trim(); $('#ccNumErr').hidden = true; });
  $('#ccExp').addEventListener('input', (e) => { const n = digits(e.target.value).slice(0, 4); e.target.value = n.length > 2 ? n.slice(0, 2) + '/' + n.slice(2) : n; });

  const err = (m) => { $('#formErr').textContent = m; $('#formErr').hidden = !m; if (m) $('#formErr').scrollIntoView({ block: 'center' }); };
  const sheet = (title, body, okText = 'Approve') => new Promise((resolve) => {
    $('#sheetTitle').textContent = title; $('#sheetBody').innerHTML = body; $('#sheetOk').textContent = okText; $('#sheet').classList.add('show');
    const done = (v) => { $('#sheet').classList.remove('show'); resolve(v); };
    $('#sheetOk').onclick = () => done(true); $('#sheetCancel').onclick = () => done(false);
  });
  const testNote = '<p class="note warn small">Test mode: this is a simulated payment screen. Nothing is charged.</p>';

  $('#form').onsubmit = async (e) => {
    e.preventDefault(); err('');
    const email = $('#email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return err('Enter a valid email so we can send your eSIM.');
    if (device && device.esim === 'no') return err(`The ${device.model} does not support eSIM. Choose a different phone.`);
    if (!$('#unlocked').checked) return err('Please confirm your phone supports eSIM and is carrier-unlocked.');
    const port = $('#portOn').checked ? { enabled: true, phone: $('#portPhone').value, carrier: $('#portCarrier').value, account: $('#portAccount').value, pin: $('#portPin').value, zip: $('#portZip').value } : null;
    if (port && !/^\d{4,10}$/.test(port.pin.trim())) return err('Enter the transfer PIN from your current carrier (4–10 digits).');
    let details = {};
    if (method === 'card') {
      const n = digits($('#ccNum').value); const [mm, yy] = $('#ccExp').value.split('/');
      if (!luhn(n)) { $('#ccNumErr').textContent = 'That card number is invalid.'; $('#ccNumErr').hidden = false; return err('Please check your card number.'); }
      details = { name: $('#ccName').value, number: n, expMonth: mm, expYear: yy, cvc: $('#ccCvc').value, zip: $('#ccZip').value };
    } else if (method === 'cashapp') {
      details = { cashtag: $('#cashtag').value };
      if (!await sheet('Cash App Pay', `${testNote}<p>Approve <b>${money(plan.priceCents)}</b> to ${esc(CONFIG.storeName)} from <b>${esc(details.cashtag || '$you')}</b>?</p>`)) return;
    } else if (method === 'paypal') {
      details = { email: $('#ppEmail').value };
      if (!await sheet('PayPal', `${testNote}<p>Pay <b>${money(plan.priceCents)}</b> to ${esc(CONFIG.storeName)} with PayPal (${esc(details.email)})?</p>`, 'Pay now')) return;
    } else if (method === 'crypto') {
      details = { asset: $('#asset').value };
      if (!await sheet(`Pay with ${details.asset}`, `${testNote}<p>Send <b>${esc($('#cryptoAmt').textContent.replace('≈ ', '').replace(' (test rate)', ''))}</b> to this sample address:</p><div class="code">${details.asset === 'BTC' ? 'bc1q-sample-test-address-do-not-send' : '0xSAMPLE-test-address-do-not-send'}</div>`, 'Simulate payment received')) return;
    } else {
      const name = method === 'apple_pay' ? 'Apple Pay' : 'Google Pay';
      if (!await sheet(name, `${testNote}<p>Pay <b>${money(plan.priceCents)}</b> to ${esc(CONFIG.storeName)}?</p>`, method === 'apple_pay' ? 'Pay with Face ID' : 'Pay')) return;
    }
    $('#payBtn').disabled = true; $('#payBtn').textContent = 'Processing…';
    try {
      const o = await api('/api/orders', { method: 'POST', body: { planId: plan.id, email, deviceId: device?.id, unlockedConfirmed: true, port, payment: { method, details } } });
      $('#portPin').value = ''; // never keep the PIN around
      location.href = `/order?n=${encodeURIComponent(o.orderNumber)}&t=${encodeURIComponent(o.token)}`;
    } catch (x) { err(x.message); $('#payBtn').disabled = false; showPlan(); }
  };
})();
