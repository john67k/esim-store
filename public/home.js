(async () => {
  await ready;
  const plans = await api('/api/plans');
  const nets = [...new Set(plans.map((p) => p.network))].sort();
  $('#fNet').insertAdjacentHTML('beforeend', nets.map((n) => `<option>${esc(n)}</option>`).join(''));
  const pre = qs('network'); if (pre) $('#fNet').value = pre;
  const render = () => {
    const q = $('#q').value.trim().toLowerCase(), net = $('#fNet').value, max = +$('#fPrice').value || Infinity, data = $('#fData').value;
    let list = plans.filter((p) => {
      if (net && p.network !== net) return false;
      if (p.priceCents > max) return false;
      if ($('#f5g').checked && !p.fiveG) return false;
      if ($('#fUnl').checked && !p.unlimited) return false;
      if ($('#fHot').checked && !p.hotspotGB) return false;
      if (data === 'unl' && !p.unlimited) return false;
      if (data && data !== 'unl') { const [a, b] = data.split('-').map(Number); if (p.unlimited || p.dataGB < a || p.dataGB > b) return false; }
      if (q && !`${p.name} ${p.network} ${p.unlimited ? 'unlimited' : ''} ${p.dataGB}gb ${p.fiveG ? '5g' : ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const dataVal = (p) => (p.unlimited ? 1e6 : 0) + p.dataGB;
    list.sort($('#fSort').value === 'data' ? (a, b) => dataVal(b) - dataVal(a) : (a, b) => a.priceCents - b.priceCents);
    $('#count').textContent = `${list.length} plan${list.length === 1 ? '' : 's'}`;
    $('#plans').innerHTML = list.map(planCard).join('') || '<div class="card center muted">No plans match. Try removing a filter.</div>';
    $('#exampleNote').hidden = !list.some((p) => p.example);
  };
  $$('.filters input, .filters select').forEach((el) => el.addEventListener('input', render));
  render();
})();
