// End-to-end API tests. Boots the app on a random port with a temporary data folder.
const os = require('os'); const fs = require('fs'); const path = require('path'); const assert = require('assert');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'esim-test-'));
process.env.ADMIN_PASSWORD = 'test-admin-pw';
delete process.env.STRIPE_SECRET_KEY; delete process.env.STRIPE_WEBHOOK_SECRET;
const logs = []; const origLog = console.log, origErr = console.error;
console.log = (...a) => { logs.push(a.join(' ')); origLog(...a); }; console.error = (...a) => { logs.push(a.join(' ')); origErr(...a); };
const app = require('../server');

(async () => {
  const srv = await new Promise((res) => { const s = app.listen(0, '127.0.0.1', () => res(s)); }); const base = `http://127.0.0.1:${srv.address().port}`;
  let cookie = '', pass = 0;
  const call = async (method, p, body, raw) => {
    const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body && JSON.stringify(body) });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    return raw ? r : { status: r.status, data: await r.json().catch(() => null) };
  };
  const ok = (c, m) => { assert.ok(c, m); pass++; origLog('  ✓', m); };
  const card = { name: 'Jane Doe', number: '4242424242424242', expMonth: '12', expYear: '2030', cvc: '123', zip: '10001' };
  const order = (extra = {}) => call('POST', '/api/orders', { planId: '10gb-1-month', email: 'Jane@Example.com', unlockedConfirmed: true, payment: { method: 'card', details: card }, ...extra });

  let r = await call('GET', '/api/config');
  ok(r.data.storeName === 'SimNow' && r.data.testMode === true && r.data.paymentMode === 'direct' && /independent seller/i.test(r.data.disclaimer) && /not Airvoice/i.test(r.data.disclaimer), 'config: brand, test mode, independent-seller disclaimer');
  ok(/confirm your order/i.test(r.data.activationNote), 'activation note is generic (after we confirm your order)');
  r = await call('GET', '/api/plans');
  ok(r.data.length === 28 && r.data.every((p) => p.network === 'Airvoice Wireless' && !p.example), 'catalog is the 28 real Airvoice Wireless plans, not example data');
  ok(r.data.every((p) => p.costCents === undefined && p.supplierSku === undefined && p.sourceUrl === undefined), 'wholesale cost / SKU / source URL never exposed publicly');
  const p10 = r.data.find((p) => p.id === '10gb-1-month');
  ok(p10 && p10.priceCents === 3000 && p10.dataGB === 10 && p10.talk === 'Unlimited' && p10.text === 'Unlimited' && p10.validityDays === 30, '10GB 1 Month is $30.00 with unlimited talk & text');
  const p10q = r.data.find((p) => p.id === '10gb-3-months');
  ok(p10q && p10q.priceCents === 8600 && p10q.monthlyPriceCents === 2867 && p10q.termMonths === 3 && p10q.validityDays === 90, '10GB 3 Months is $86.00 due today ($28.67/mo)');
  r = await call('GET', '/api/plans/unlimited-1-month'); ok(r.data.unlimited && r.data.fiveG && r.data.priceCents === 5400 && r.data.dataGB === 40, 'Unlimited 1 Month is $54.00 (40GB high-speed)');
  r = await call('GET', '/api/plans/nope'); ok(r.status === 404, 'missing plan 404');
  r = await call('GET', '/api/devices');
  const dev = (m) => r.data.find((d) => d.model === m);
  ok(dev('iPhone 15').esim === 'yes' && dev('Pixel 8').esim === 'yes' && dev('Galaxy S24').esim === 'yes' && dev('iPhone X').esim === 'no', 'device compatibility list');

  r = await order({ email: 'bad' }); ok(r.status === 400 && /email/i.test(r.data.error), 'bad email rejected');
  r = await order({ unlockedConfirmed: false }); ok(r.status === 400 && /unlocked/.test(r.data.error), 'must confirm unlocked phone');
  r = await order({ deviceId: 'apple-iphone-x' }); ok(r.status === 400 && /does not support eSIM/.test(r.data.error), 'non-eSIM phone blocked');
  r = await order({ payment: { method: 'card', details: { ...card, number: '4242424242424241' } } }); ok(r.status === 400 && /not valid/.test(r.data.error), 'Luhn check rejects bad card');
  r = await order({ payment: { method: 'card', details: { ...card, expYear: '2020' } } }); ok(r.status === 400, 'expired card rejected');
  r = await order({ payment: { method: 'card', details: { ...card, number: '4000000000000002' } } }); ok(r.status === 402 && /declined/.test(r.data.error), 'test decline card declined');
  r = await order({ planId: 'nope' }); ok(r.status === 400, 'unknown plan rejected');

  r = await order({ deviceId: 'apple-iphone-15' });
  ok(r.status === 201 && /^SN-[A-Z2-9]{6}$/.test(r.data.orderNumber) && r.data.payment.last4 === '4242', 'card order succeeds');
  const o1 = r.data;
  ok(o1.status === 'paid' && o1.statusLabel === 'Paid – awaiting activation' && o1.esim === null, 'paid order waits for manual activation (no SAMPLE eSIM)');
  ok(o1.email === 'jane@example.com' && o1.device.model === 'iPhone 15', 'order stores email + device');
  r = await call('GET', `/api/orders/${o1.orderNumber}/qr.svg?token=${o1.token}`); ok(r.status === 404, 'QR is hidden until the order is activated');
  r = await call('GET', `/api/orders/${o1.orderNumber}?token=${o1.token}`); ok(r.data.status === 'paid' && r.data.esim === null, 'order page loads with token, still awaiting activation');
  r = await call('GET', `/api/orders/${o1.orderNumber}?token=nope`); ok(r.status === 404, 'order hidden without token');

  for (const [method, details] of [['apple_pay', {}], ['google_pay', {}], ['cashapp', { cashtag: '$janedoe' }], ['paypal', { email: 'jane@example.com' }], ['crypto', { asset: 'BTC' }], ['crypto', { asset: 'USDC' }]]) {
    r = await order({ planId: '1-gb-1-month', payment: { method, details } }); ok(r.status === 201 && r.data.payment.method === method && r.data.status === 'paid', `${method}${details.asset ? ' ' + details.asset : ''} order succeeds (simulated) and awaits activation`);
  }
  ok(r.data.payment.amount === '12.00', 'crypto amount computed');
  r = await order({ payment: { method: 'cashapp', details: { cashtag: 'nope' } } }); ok(r.status === 400, 'bad $Cashtag rejected');
  r = await order({ payment: { method: 'venmo', details: {} } }); ok(r.status === 400, 'unknown method rejected');

  const PIN = '918273';
  const port = { enabled: true, phone: '(212) 555-0147', carrier: 'T-Mobile', account: '987654321', pin: PIN, zip: '10001' };
  r = await order({ port: { ...port, pin: '12' } }); ok(r.status === 400 && /PIN/.test(r.data.error), 'short transfer PIN rejected');
  r = await order({ port: { ...port, zip: '1' } }); ok(r.status === 400 && /ZIP/.test(r.data.error), 'bad port ZIP rejected');
  r = await order({ port });
  ok(r.status === 201 && r.data.port.phone === '+12125550147' && r.data.port.accountLast4 === '4321', 'port-in order succeeds');
  const portOrder = r.data;
  ok(!JSON.stringify(r.data).includes(PIN) && r.data.port.pin === undefined, 'PIN not returned after submit');
  const db = fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'), 'utf8');
  ok(!db.includes(PIN) && !db.includes('987654321'), 'PIN and full account number never stored');
  ok(!db.includes('4242424242424242') && !db.includes('"cvc"'), 'full card number / CVC never stored');
  ok(!logs.join('\n').includes(PIN), 'PIN never logged');

  r = await call('POST', '/api/orders/lookup', { email: 'JANE@example.com', orderNumber: portOrder.orderNumber.toLowerCase() });
  ok(r.status === 200 && r.data.orderNumber === portOrder.orderNumber && r.data.status === 'paid', 'My orders lookup by email + order number');
  r = await call('POST', '/api/orders/lookup', { email: 'other@example.com', orderNumber: portOrder.orderNumber }); ok(r.status === 404, 'lookup with wrong email fails');

  r = await call('GET', '/api/admin/orders'); ok(r.status === 401, 'admin requires login');
  r = await call('POST', '/api/admin/login', { password: 'wrong' }); ok(r.status === 401, 'wrong admin password rejected');
  r = await call('POST', '/api/admin/login', { password: 'test-admin-pw' }); ok(r.status === 200 && cookie.startsWith('admin='), 'admin login');
  r = await call('GET', '/api/admin/orders');
  ok(r.data.orders.length === 8 && r.data.totals.count === 8 && r.data.totals.awaiting === 8 && r.data.totals.revenueCents === 3000 * 2 + 1200 * 6 && r.data.totals.profitCents === 0, 'admin sees paid orders + revenue (profit $0 until you enter your dealer cost)');
  ok(!JSON.stringify(r.data).includes(PIN), 'admin view never shows PIN');

  r = await call('POST', `/api/admin/orders/${o1.orderNumber}/activate`, { iccid: '123', smdpAddress: 'smdp.example.com', activationCode: 'ABCDE-1234' });
  ok(r.status === 400 && /ICCID/.test(r.data.error), 'short ICCID rejected');
  r = await call('POST', `/api/admin/orders/${o1.orderNumber}/activate`, { iccid: '8901410123456789012', smdpAddress: 'not-a-host', activationCode: 'ABCDE-1234' });
  ok(r.status === 400 && /SM-DP/.test(r.data.error), 'bad SM-DP+ address rejected');
  const ACT = { iccid: '8901410123456789012', smdpAddress: 'smdp.example.com', activationCode: 'ABCDE-FGHI-JKLM', phoneNumber: '(415) 555-0100' };
  r = await call('POST', `/api/admin/orders/${o1.orderNumber}/activate`, ACT);
  ok(r.status === 200 && r.data.status === 'activated' && r.data.esim.lpa === 'LPA:1$smdp.example.com$ABCDE-FGHI-JKLM' && r.data.esim.phoneNumber === '+14155550100', 'admin marks a paid order activated and builds the LPA string');
  r = await call('GET', `/api/orders/${o1.orderNumber}?token=${o1.token}`);
  ok(r.data.status === 'activated' && r.data.esim.smdpAddress === 'smdp.example.com' && r.data.esim.iccid === ACT.iccid && r.data.esim.lpa === `LPA:1$${r.data.esim.smdpAddress}$${r.data.esim.activationCode}`, 'customer order page now shows real activation details');
  r = await call('GET', `/api/orders/${o1.orderNumber}/qr.svg?token=${o1.token}`, null, true);
  const svg = await r.text();
  ok(r.status === 200 && r.headers.get('content-type').startsWith('image/svg+xml') && svg.includes('<svg') && !/SAMPLE/i.test(svg), 'QR code SVG is rendered from the LPA string with no SAMPLE watermark');
  ok(!fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'), 'utf8').includes(PIN), 'PIN still not stored after activation');

  r = await call('POST', `/api/admin/orders/${portOrder.orderNumber}/activate`, { iccid: '8901410123456789012', lpa: 'LPA:1$rsp.example.net$CODE-99', phoneNumber: '2125550147' });
  ok(r.status === 200 && r.data.esim.smdpAddress === 'rsp.example.net' && r.data.esim.activationCode === 'CODE-99', 'admin can paste a full LPA:1$smdp$code string');

  r = await call('POST', '/api/admin/plans', { name: 'Test Plan 12GB', network: 'AT&T network', cost: '10.00', markupPct: 50, dataGB: 12, hotspotGB: 5, validityDays: 30, fiveG: true });
  ok(r.status === 201 && r.data.priceCents === 1500 && r.data.id === 'test-plan-12gb', 'add plan with markup %');
  r = await call('GET', '/api/plans/test-plan-12gb'); ok(r.data && r.data.priceCents === 1500 && r.data.example === false, 'new plan visible in store');
  r = await call('PUT', '/api/admin/plans/test-plan-12gb', { price: '17.99' }); ok(r.data.priceCents === 1799 && r.data.dataGB === 12, 'edit plan price');
  r = await call('PUT', '/api/admin/plans/test-plan-12gb', { price: '-1' }); ok(r.status === 400, 'invalid price rejected');
  r = await call('PUT', '/api/admin/plans/test-plan-12gb', { active: false }); r = await call('GET', '/api/plans/test-plan-12gb'); ok(r.status === 404, 'hidden plan not for sale');
  r = await call('DELETE', '/api/admin/plans/test-plan-12gb'); ok(r.data.ok, 'remove plan');
  r = await call('GET', '/api/admin/plans'); ok(!r.data.some((p) => p.id === 'test-plan-12gb'), 'plan gone after remove');
  r = await call('POST', '/api/admin/logout'); cookie = ''; r = await call('GET', '/api/admin/plans'); ok(r.status === 401, 'logout ends session');
  r = await call('POST', `/api/admin/orders/${o1.orderNumber}/activate`, ACT); ok(r.status === 401, 'activation requires admin login');

  for (const p of ['/', '/plan', '/compatibility', '/checkout', '/order', '/orders', '/admin']) { r = await call('GET', p, null, true); ok(r.status === 200 && (await r.text()).includes('<main'), `page ${p} served`); }
  r = await call('GET', '/manifest.json', null, true);
  ok(r.status === 200 && r.headers.get('content-type').includes('json'), 'manifest.json is served');
  const man = await r.json();
  ok(man.name === 'SimNow' && man.display === 'standalone' && man.theme_color && (man.icons || []).some((i) => i.sizes === '192x192') && (man.icons || []).some((i) => i.sizes === '512x512'), 'manifest has name, standalone display, theme color, and 192/512 icons');
  r = await call('GET', '/sw.js', null, true);
  const sw = await r.text();
  ok(r.status === 200 && sw.includes('simnow-shell') && sw.includes('/api/'), 'service worker is served');
  ok(/startsWith\(['"]\/api\//.test(sw) && sw.includes('fetch(req)'), 'service worker uses network-first for /api');
  origLog(`\n${pass} API checks passed`);
  srv.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
})().catch((e) => { origErr('FAILED:', e.message); process.exit(1); });
