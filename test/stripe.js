// Stripe Checkout tests with a fake Stripe client (no network). Webhook signatures are real,
// made with Stripe's own test-header helper and checked by stripe.webhooks.constructEvent.
const os = require('os'); const fs = require('fs'); const path = require('path'); const assert = require('assert');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'esim-stripe-'));
process.env.ADMIN_PASSWORD = 'stripe-admin-pw';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_for_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_123';
process.env.PUBLIC_URL = 'https://shop.example.com';
const Stripe = require('stripe');
const payments = require('../providers/payments');
const created = [];
payments.setClient({ checkout: { sessions: { create: async (params) => { created.push(params); return { id: 'cs_test_' + created.length, url: 'https://checkout.stripe.com/c/pay/cs_test_' + created.length }; } } } });
const app = require('../server');

(async () => {
  const srv = await new Promise((res) => { const s = app.listen(0, '127.0.0.1', () => res(s)); }); const base = `http://127.0.0.1:${srv.address().port}`;
  let pass = 0, cookie = '';
  const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ✓', m); };
  const call = async (method, p, body) => {
    const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body && JSON.stringify(body) });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  const hook = async (event, { secret = process.env.STRIPE_WEBHOOK_SECRET, sig } = {}) => {
    const payload = JSON.stringify(event);
    const header = sig ?? Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const r = await fetch(base + '/api/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': header }, body: payload });
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  const completed = (o, extra = {}) => ({ id: 'evt_' + Math.random().toString(36).slice(2), type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', object: 'checkout.session', payment_status: 'paid', amount_total: o.amountCents, payment_intent: 'pi_test_1', client_reference_id: o.orderNumber, metadata: { orderNumber: o.orderNumber }, ...extra } } });

  let r = await call('GET', '/api/config');
  ok(r.data.testMode === false && r.data.paymentMode === 'redirect', 'STRIPE_SECRET_KEY switches the store to live Stripe Checkout (no TEST MODE)');

  r = await call('POST', '/api/orders', { planId: '25-gb-3-months', email: 'kim@example.com', unlockedConfirmed: true });
  ok(r.status === 201 && r.data.checkoutUrl.startsWith('https://checkout.stripe.com/') && r.data.status === 'pending_payment', 'order creates a Stripe Checkout Session and returns its URL');
  const o = r.data, s = created[0];
  ok(s.mode === 'payment' && s.line_items[0].price_data.unit_amount === 13700 && s.line_items[0].price_data.currency === 'usd' && s.customer_email === 'kim@example.com', 'session charges the exact plan price ($137.00) in USD');
  ok(s.metadata.orderNumber === o.orderNumber && s.client_reference_id === o.orderNumber, 'session carries the order number');
  ok(s.success_url === `https://shop.example.com/order?n=${o.orderNumber}&t=${encodeURIComponent(o.token)}&paid=1` && s.cancel_url === 'https://shop.example.com/checkout?plan=25-gb-3-months&canceled=1', 'success and cancel URLs point back to the store');
  ok(/independent seller/.test(s.line_items[0].price_data.product_data.description), 'Stripe line item says independent seller');

  r = await hook(completed(o), { sig: 't=1,v1=deadbeef' }); ok(r.status === 400, 'webhook with a bad signature is rejected');
  r = await hook(completed(o), { secret: 'whsec_wrong' }); ok(r.status === 400, 'webhook signed with the wrong secret is rejected');
  r = await fetch(base + '/api/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(completed(o)) }).then((x) => x.status);
  ok(r === 400, 'webhook without a signature header is rejected');
  r = await call('GET', `/api/orders/${o.orderNumber}?token=${o.token}`); ok(r.data.status === 'pending_payment', 'order stays unpaid after rejected webhooks');

  r = await hook(completed(o, { amount_total: 100 })); r = await call('GET', `/api/orders/${o.orderNumber}?token=${o.token}`);
  ok(r.data.status === 'pending_payment', 'webhook with a mismatched amount does not mark the order paid');

  r = await hook(completed(o)); ok(r.status === 200 && r.data.received, 'correctly signed webhook accepted');
  r = await call('GET', `/api/orders/${o.orderNumber}?token=${o.token}`);
  ok(r.data.status === 'paid' && r.data.statusLabel === 'Paid – awaiting activation' && r.data.esim === null, 'webhook marks the order "Paid – awaiting activation"');
  r = await hook(completed(o)); r = await call('GET', `/api/orders/${o.orderNumber}?token=${o.token}`); ok(r.data.status === 'paid', 'repeat webhook is harmless');

  r = await call('POST', '/api/orders', { planId: '1-gb-1-month', email: 'lee@example.com', unlockedConfirmed: true });
  const o2 = r.data;
  r = await hook({ id: 'evt_x', type: 'checkout.session.expired', data: { object: { id: 'cs_test_2', metadata: { orderNumber: o2.orderNumber } } } });
  r = await call('GET', `/api/orders/${o2.orderNumber}?token=${o2.token}`); ok(r.data.status === 'canceled', 'expired Checkout Session cancels the unpaid order');

  await call('POST', '/api/admin/login', { password: 'stripe-admin-pw' });
  r = await call('POST', `/api/admin/orders/${o2.orderNumber}/activate`, { iccid: '8901410123456789012', smdpAddress: 'smdp.example.com', activationCode: 'ABCD-1234' });
  ok(r.status === 409, 'unpaid/canceled orders cannot be activated');
  r = await call('GET', '/api/admin/orders'); ok(r.data.totals.count === 1 && r.data.totals.revenueCents === 13700, 'admin sales count only paid orders');
  r = await call('POST', `/api/admin/orders/${o.orderNumber}/activate`, { iccid: '8901410123456789012', smdpAddress: 'smdp.example.com', activationCode: 'ABCD-1234' });
  ok(r.status === 200 && r.data.status === 'activated', 'admin activates the Stripe-paid order');

  payments.setClient({ checkout: { sessions: { create: async () => { throw new Error('boom'); } } } });
  r = await call('POST', '/api/orders', { planId: '1-gb-1-month', email: 'x@example.com', unlockedConfirmed: true });
  ok(r.status === 503, 'Stripe errors show a friendly "try again" message');

  console.log(`\n${pass} Stripe checks passed`);
  srv.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
