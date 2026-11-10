(async () => {
  await ready;
  let plans = [], editing = null;
  const show = async () => {
    if (!(await api('/api/admin/me')).loggedIn) { $('#login').hidden = false; $('#dash').hidden = true; return; }
    $('#login').hidden = true; $('#dash').hidden = false; loadOrders(); loadPlans();
  };
  $('#login').onsubmit = async (e) => {
    e.preventDefault(); $('#loginErr').hidden = true;
    try { await api('/api/admin/login', { method: 'POST', body: { password: $('#pw').value } }); $('#pw').value = ''; show(); }
    catch (x) { $('#loginErr').textContent = x.message; $('#loginErr').hidden = false; }
  };
  $('#logout').onclick = async () => { await api('/api/admin/logout', { method: 'POST' }); show(); };
  $$('[data-tab]').forEach((b) => (b.onclick = () => { $$('[data-tab]').forEach((x) => x.classList.toggle('on', x === b)); $$('[data-tabpane]').forEach((p) => (p.hidden = p.dataset.tabpane !== b.dataset.tab)); }));

  async function loadOrders() {
    const { orders, totals } = await api('/api/admin/orders');
    $('#sCount').textContent = totals.count; $('#sRev').textContent = money(totals.revenueCents); $('#sProfit').textContent = money(totals.profitCents);
    $('#orderList').innerHTML = orders.map((o) => {
      const st = o.status === 'paid' ? 'tag y' : o.status === 'activated' ? 'tag g' : 'tag';
      const act = o.status === 'paid' || o.status === 'activated' ? `<form class="activate" data-activate="${esc(o.orderNumber)}">
        <p class="small" style="margin:8px 0 4px"><b>${o.status === 'activated' ? 'Update eSIM details' : 'Activate this order'}</b> — paste the details from the dealer portal.</p>
        <div class="row"><div><label>ICCID</label><input name="iccid" inputmode="numeric" required placeholder="18–22 digits" value="${esc(o.esim?.iccid || '')}"></div>
        <div><label>Phone number</label><input name="phoneNumber" type="tel" placeholder="(optional)" value="${esc(o.esim?.phoneNumber || '')}"></div></div>
        <label>SM-DP+ address</label><input name="smdpAddress" required placeholder="smdp.example.com" value="${esc(o.esim?.smdpAddress || '')}">
        <label>Activation code</label><input name="activationCode" required placeholder="or paste a full LPA:1$… code" value="${esc(o.esim?.activationCode || '')}">
        <button class="btn sm" type="submit" style="margin-top:8px">${o.status === 'activated' ? 'Save changes' : 'Mark activated'}</button>
        <div class="err" hidden></div></form>` : '';
      return `<div class="adm-order"><div class="summary"><b>${esc(o.orderNumber)}</b><b>${money(o.amountCents)}</b></div>
      <div>${esc(o.plan.name)} · <span class="muted">${esc(o.plan.network)}</span> · <span class="${st}">${esc(o.statusLabel || o.status)}</span></div>
      <div class="small muted">${esc(o.email)} · ${esc((o.payment.method || '').replaceAll('_', ' '))}${o.payment.last4 ? ' ••' + esc(o.payment.last4) : ''} · ${new Date(o.createdAt).toLocaleString()}</div>
      <div class="small">${o.testMode ? '<span class="tag y">test</span> ' : ''}${o.port ? `<span class="tag">port-in ${esc(o.port.phone)} from ${esc(o.port.carrier)}: ${esc(o.port.status)}</span>` : ''}</div>${act}</div>`;
    }).join('') || '<p class="muted center">No orders yet.</p>';
    $$('[data-activate]').forEach((f) => (f.onsubmit = async (e) => {
      e.preventDefault(); const err = f.querySelector('.err'); err.hidden = true;
      const body = Object.fromEntries(new FormData(f).entries());
      try { await api('/api/admin/orders/' + encodeURIComponent(f.dataset.activate) + '/activate', { method: 'POST', body }); loadOrders(); }
      catch (x) { err.textContent = x.message; err.hidden = false; }
    }));
  }
  async function loadPlans() {
    plans = await api('/api/admin/plans');
    $('#planList').innerHTML = plans.map((p) => `<div class="plan-row"><div><b>${esc(p.name)}</b>${p.active ? '' : ' <span class="tag y">hidden</span>'}${p.example ? ' <span class="tag y">example</span>' : ''}
      <div class="small muted">${esc(p.network)} · cost ${money(p.costCents)} → price ${money(p.priceCents)} (profit ${money(p.priceCents - p.costCents)})</div></div>
      <button class="btn sm light" type="button" data-edit="${esc(p.id)}">Edit</button></div>`).join('') || '<p class="muted">No plans. Add one.</p>';
    $$('[data-edit]').forEach((b) => (b.onclick = () => openForm(plans.find((p) => p.id === b.dataset.edit))));
  }
  const F = { name: 'pName', network: 'pNet', cost: 'pCost', price: 'pPrice', dataGB: 'pData', hotspotGB: 'pHot', validityDays: 'pDays', talk: 'pTalk', text: 'pText', supplierSku: 'pSku', notes: 'pNotes' };
  function openForm(p) {
    editing = p || null; $('#planForm').hidden = false; $('#pErr').hidden = true; $('#pfTitle').textContent = p ? 'Edit plan' : 'Add plan'; $('#pDelete').hidden = !p;
    const val = p ? { ...p, cost: (p.costCents / 100).toFixed(2), price: (p.priceCents / 100).toFixed(2) } : { validityDays: 30, talk: 'Unlimited', text: 'Unlimited' };
    for (const [k, id] of Object.entries(F)) $('#' + id).value = val[k] ?? '';
    $('#pMarkup').value = p ? Math.round((p.priceCents / p.costCents - 1) * 100) : '';
    $('#pUnl').checked = !!val.unlimited; $('#p5g').checked = !!val.fiveG; $('#pActive').checked = val.active ?? true; $('#pExample').checked = !!val.example;
    margin(); $('#planForm').scrollIntoView({ behavior: 'smooth' });
  }
  const margin = () => { const c = +$('#pCost').value, pr = +$('#pPrice').value; $('#pMargin').textContent = c && pr ? `Profit per sale: $${(pr - c).toFixed(2)} (${Math.round((pr / c - 1) * 100)}% markup)` : 'Type a markup % to fill in the price, or type the price yourself.'; };
  $('#pMarkup').oninput = () => { const c = +$('#pCost').value, m = +$('#pMarkup').value; if (c && $('#pMarkup').value !== '') $('#pPrice').value = (c * (1 + m / 100)).toFixed(2); margin(); };
  $('#pCost').oninput = $('#pMarkup').oninput; $('#pPrice').oninput = margin;
  $('#addPlan').onclick = () => openForm(null);
  $('#pCancel').onclick = () => ($('#planForm').hidden = true);
  $('#planForm').onsubmit = async (e) => {
    e.preventDefault(); $('#pErr').hidden = true;
    const body = { unlimited: $('#pUnl').checked, fiveG: $('#p5g').checked, active: $('#pActive').checked, example: $('#pExample').checked };
    for (const [k, id] of Object.entries(F)) body[k] = $('#' + id).value;
    try { await api(editing ? '/api/admin/plans/' + encodeURIComponent(editing.id) : '/api/admin/plans', { method: editing ? 'PUT' : 'POST', body }); $('#planForm').hidden = true; loadPlans(); }
    catch (x) { $('#pErr').textContent = x.message; $('#pErr').hidden = false; }
  };
  $('#pDelete').onclick = async () => {
    if (!editing || !confirm(`Remove "${editing.name}" from the store?`)) return;
    await api('/api/admin/plans/' + encodeURIComponent(editing.id), { method: 'DELETE' }); $('#planForm').hidden = true; loadPlans();
  };
  show();
})();
