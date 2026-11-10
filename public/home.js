(async () => {
  await ready;
  const plans = await api('/api/plans');
  const DATA = [
    { key: '1', label: '1GB', test: (p) => !p.unlimited && p.dataGB === 1 },
    { key: '3', label: '3GB', test: (p) => !p.unlimited && p.dataGB === 3 },
    { key: '6', label: '6GB', test: (p) => !p.unlimited && p.dataGB === 6 },
    { key: '10', label: '10GB', test: (p) => !p.unlimited && p.dataGB === 10, popular: true },
    { key: '16', label: '16GB', test: (p) => !p.unlimited && p.dataGB === 16 },
    { key: '25', label: '25GB', test: (p) => !p.unlimited && p.dataGB === 25 },
    { key: 'unl', label: 'Unlimited', test: (p) => !!p.unlimited },
  ];
  const TERMS = [1, 3, 6, 12];
  const inCatalog = (p) => DATA.some((d) => d.test(p)) && TERMS.includes(p.termMonths);
  const extras = plans.filter((p) => !inCatalog(p));
  let dataKey = '10', term = 1;
  const pre = plans.find((p) => p.id === qs('plan'));
  if (pre) {
    const d = DATA.find((x) => x.test(pre)); if (d) dataKey = d.key;
    if (pre.termMonths) term = pre.termMonths;
  }

  const monthlyOf = (p) => p.monthlyPriceCents || (p.termMonths ? Math.round(p.priceCents / p.termMonths) : p.priceCents);
  const findPlan = () => plans.find((p) => DATA.find((d) => d.key === dataKey).test(p) && p.termMonths === term);
  const month1 = () => plans.find((p) => DATA.find((d) => d.key === dataKey).test(p) && p.termMonths === 1);

  $('#dataTabs').innerHTML = DATA.map((d) => `<button type="button" role="tab" data-data="${d.key}" class="${d.key === dataKey ? 'on' : ''}${d.popular ? ' pop' : ''}">${esc(d.label)}${d.popular ? '<span class="chip-pop">Most popular</span>' : ''}</button>`).join('');
  $('#termTabs').innerHTML = TERMS.map((t) => `<button type="button" role="tab" data-term="${t}" class="${t === term ? 'on' : ''}">${t === 1 ? '1 mo' : t + ' mo'}</button>`).join('');

  const render = () => {
    $$('#dataTabs button').forEach((b) => b.classList.toggle('on', b.dataset.data === dataKey));
    $$('#termTabs button').forEach((b) => b.classList.toggle('on', +b.dataset.term === term));
    const p = findPlan();
    const m1 = month1();
    if (!p) { $('#picked').innerHTML = '<div class="card center muted">That combination is not available.</div>'; }
    else {
      const save = m1 && term > 1 ? m1.priceCents * term - p.priceCents : 0;
      const saveTag = save > 0 ? `<div class="save">Save ${money(save)} vs paying month to month</div>` : '';
      const pop = dataKey === '10' ? '<span class="popular">Most popular</span>' : '';
      const priced = `<div class="price">${money(monthlyOf(p))} <small>/mo</small></div>
        <div class="due">Due today ${money(p.priceCents)} · ${esc(termText(p))}</div>${saveTag}`;
      $('#picked').innerHTML = `<div class="plan" data-plan="${esc(p.id)}">${pop}<div class="net">${esc(p.network)} plan</div>
        <h3>${esc(p.name)}</h3>${planTags(p)}${priced}${planSpecs(p)}
        <div class="acts"><a class="btn light" href="/plan?id=${encodeURIComponent(p.id)}">Details</a><a class="btn" href="/checkout?plan=${encodeURIComponent(p.id)}">Get this plan</a></div></div>`;
    }
    $('#plans').innerHTML = extras.map((x) => planCard(x)).join('');
    $('#exampleNote').hidden = !plans.some((x) => x.example);
  };
  $('#dataTabs').onclick = (e) => { const b = e.target.closest('[data-data]'); if (!b) return; dataKey = b.dataset.data; render(); };
  $('#termTabs').onclick = (e) => { const b = e.target.closest('[data-term]'); if (!b) return; term = +b.dataset.term; render(); };
  render();
  compatWidget($('#compat'));
  showInstallHint($('#a2hs'));
})();
