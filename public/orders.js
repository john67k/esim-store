(async () => {
  await ready;
  $('#lookup').onsubmit = async (e) => {
    e.preventDefault(); $('#lErr').hidden = true;
    try { const o = await api('/api/orders/lookup', { method: 'POST', body: { email: $('#lEmail').value, orderNumber: $('#lNum').value } }); $('#lookup').hidden = true; renderOrder(o, $('#order')); scrollTo(0, 0); }
    catch (x) { $('#lErr').textContent = x.message; $('#lErr').hidden = false; }
  };
})();
