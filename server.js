// eSIM prepaid plan store. TEST MODE while the mock supplier + mock payments are in use.
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const config = require('./config');
const store = require('./lib/store');
const v = require('./lib/validation');
const ids = require('./lib/ids');
const { DEVICES } = require('./lib/devices');
const supplier = require('./providers/supplier');
const payments = require('./providers/payments');

const TEST_MODE = supplier.testMode || payments.testMode;
const MAX_PRICE_CENTS = 100000; // $1,000 safety cap per plan

// Admin password: ADMIN_PASSWORD env var (Render generates one). Locally, a random one is saved to data/admin-password.txt.
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  const f = path.join(store.DATA_DIR, 'admin-password.txt');
  try { ADMIN_PASSWORD = fs.readFileSync(f, 'utf8').trim(); } catch {}
  if (!ADMIN_PASSWORD) { ADMIN_PASSWORD = crypto.randomBytes(12).toString('base64url'); fs.writeFileSync(f, ADMIN_PASSWORD + '\n', { mode: 0o600 }); }
  console.log(`ADMIN_PASSWORD not set; using the one saved in ${f}`);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Render puts one proxy in front of the app
app.use(express.json({ limit: '20kb' }));
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'" });
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const clean = (s, max = 100) => String(s ?? '').trim().slice(0, max);
const eqSafe = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// Simple in-memory rate limiter (per IP + bucket)
const hits = new Map();
function limited(req, bucket, max, windowMs) {
  const k = bucket + ':' + req.ip; const now = Date.now();
  const h = (hits.get(k) || []).filter((t) => now - t < windowMs); h.push(now); hits.set(k, h);
  return h.length > max;
}

// ---------- public views ----------
const publicPlan = (p) => ({ id: p.id, name: p.name, network: p.network, example: !!p.example, fiveG: !!p.fiveG, unlimited: !!p.unlimited,
  dataGB: p.dataGB, talk: p.talk, text: p.text, hotspotGB: p.hotspotGB, validityDays: p.validityDays, priceCents: p.priceCents, notes: p.notes || '' });
const publicOrder = (o) => ({ orderNumber: o.orderNumber, token: o.token, status: o.status, email: o.email, createdAt: o.createdAt,
  plan: o.plan, amountCents: o.amountCents, payment: o.payment, device: o.device, esim: o.esim, port: o.port, testMode: o.testMode });

app.get('/api/config', (req, res) => res.json({ storeName: config.STORE_NAME, disclaimer: config.DISCLAIMER, supportEmail: config.SUPPORT_EMAIL,
  testMode: TEST_MODE, paymentMethods: payments.METHODS, cryptoRates: payments.RATES }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/plans', (req, res) => res.json(store.db.plans.filter((p) => p.active).map(publicPlan)));
app.get('/api/plans/:id', (req, res) => {
  const p = store.db.plans.find((x) => x.id === req.params.id && x.active);
  return p ? res.json(publicPlan(p)) : bad(res, 'Plan not found', 404);
});
app.get('/api/devices', (req, res) => res.json(DEVICES));

// ---------- checkout ----------
function validatePort(port) {
  if (!port || !port.enabled) return [null, null];
  const phone = v.normPhone(port.phone);
  if (!phone) return ['Enter the 10-digit phone number you want to keep.'];
  if (!clean(port.carrier, 60)) return ['Enter your current carrier.'];
  const account = clean(port.account, 30);
  if (!/^[A-Za-z0-9-]{4,30}$/.test(account)) return ['Enter your current account number (from your carrier account page).'];
  const pin = String(port.pin ?? '').trim();
  if (!/^\d{4,10}$/.test(pin)) return ['Enter the transfer PIN from your current carrier (4–10 digits).'];
  if (!/^\d{5}$/.test(String(port.zip ?? '').trim())) return ['Enter the 5-digit billing ZIP on your current account.'];
  return [null, { phone, carrier: clean(port.carrier, 60), account, pin, zip: String(port.zip).trim() }];
}

app.post('/api/orders', async (req, res) => {
  if (limited(req, 'order', 30, 60_000)) return bad(res, 'Too many attempts. Please wait a minute.', 429);
  const b = req.body || {};
  const plan = store.db.plans.find((x) => x.id === b.planId && x.active);
  if (!plan) return bad(res, 'Please choose a plan.');
  const email = clean(b.email, 120).toLowerCase();
  if (!v.validEmail(email)) return bad(res, 'Enter a valid email so we can send your eSIM.');
  const device = b.deviceId ? DEVICES.find((d) => d.id === b.deviceId) : null;
  if (device && device.esim === 'no') return bad(res, `${device.model} does not support eSIM.`);
  if (!b.unlockedConfirmed) return bad(res, 'Please confirm your phone is carrier-unlocked.');
  const [portErr, port] = validatePort(b.port);
  if (portErr) return bad(res, portErr);

  const orderNumber = ids.orderNumber();
  let charge;
  try { charge = await payments.charge({ amountCents: plan.priceCents, method: b.payment?.method, details: b.payment?.details || {}, orderNumber, email }); }
  catch (e) { console.error('payment error', orderNumber, e.message); return bad(res, 'Payment is not available right now.', 503); }
  if (!charge.ok) return bad(res, charge.userError || 'Payment failed.', charge.declined ? 402 : 400);

  let esim;
  try { esim = await supplier.orderEsim({ plan, orderNumber, email }); }
  catch (e) { console.error('supplier error', orderNumber, e.message); return bad(res, 'We could not issue your eSIM. You have not been charged (test mode).', 502); }

  let portOut = null;
  if (port) {
    let portRes;
    try { portRes = await supplier.submitPortIn({ orderNumber, port }); } catch (e) { portRes = { status: 'needs attention' }; console.error('port-in error', orderNumber); }
    // Store only what's needed to follow up. The transfer PIN is never saved, logged, or shown again.
    portOut = { phone: port.phone, carrier: port.carrier, accountLast4: port.account.slice(-4), zip: port.zip, pinProvided: true, status: portRes.status, portRef: portRes.portRef || null };
  }

  const order = { orderNumber, token: ids.token(), status: 'active', email, createdAt: new Date().toISOString(), testMode: TEST_MODE,
    plan: publicPlan(plan), amountCents: plan.priceCents, costCents: plan.costCents, payment: { ref: charge.ref, ...charge.summary },
    device: device ? { brand: device.brand, model: device.model } : null, esim, port: portOut };
  store.db.orders.push(order); store.save();
  console.log(`order ${orderNumber} plan=${plan.id} method=${charge.summary.method}${portOut ? ' port-in' : ''}`);
  res.status(201).json(publicOrder(order));
});

function findOrder(num) { return store.db.orders.find((o) => o.orderNumber === String(num || '').trim().toUpperCase()); }
app.get('/api/orders/:num', (req, res) => {
  const o = findOrder(req.params.num);
  if (!o || !eqSafe(o.token, req.query.token || '')) return bad(res, 'Order not found', 404);
  res.json(publicOrder(o));
});
app.post('/api/orders/lookup', (req, res) => {
  if (limited(req, 'lookup', 10, 60_000)) return bad(res, 'Too many lookups. Please wait a minute.', 429);
  const o = findOrder(req.body?.orderNumber);
  if (!o || o.email !== clean(req.body?.email, 120).toLowerCase()) return bad(res, 'No order matches that email and order number.', 404);
  res.json(publicOrder(o));
});
app.get('/api/orders/:num/qr.svg', async (req, res) => {
  const o = findOrder(req.params.num);
  if (!o || !eqSafe(o.token, req.query.token || '')) return bad(res, 'Order not found', 404);
  let qr = await QRCode.toString(o.esim.lpa, { type: 'svg', margin: 1, errorCorrectionLevel: 'H' });
  qr = qr.replace(/<\?xml[^>]*>/, '').replace('<svg ', '<svg x="20" y="20" width="260" height="260" ');
  const sample = o.esim.sample ? `<g transform="rotate(-30 150 150)"><rect x="20" y="118" width="260" height="64" fill="#fff" opacity=".85"/>
    <text x="150" y="168" font-family="Arial,sans-serif" font-size="52" font-weight="900" text-anchor="middle" fill="#d11">SAMPLE</text></g>
    <text x="150" y="312" font-family="Arial,sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="#d11">SAMPLE · WILL NOT ACTIVATE</text>` : '';
  res.type('image/svg+xml').send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 ${o.esim.sample ? 330 : 300}"><rect width="100%" height="100%" fill="#fff"/>${qr}${sample}</svg>`);
});

// ---------- admin ----------
const sessions = new Map(); // token -> expiry
const SESSION_MS = 8 * 3600_000;
function cookieToken(req) { const m = /(?:^|;\s*)admin=([^;]+)/.exec(req.headers.cookie || ''); return m && m[1]; }
function requireAdmin(req, res, next) {
  const t = cookieToken(req); const exp = t && sessions.get(t);
  if (!exp || exp < Date.now()) return bad(res, 'Please log in', 401);
  next();
}
app.post('/api/admin/login', (req, res) => {
  if (limited(req, 'login', 8, 15 * 60_000)) return bad(res, 'Too many attempts. Try again later.', 429);
  if (!eqSafe(req.body?.password || '', ADMIN_PASSWORD)) return bad(res, 'Wrong password', 401);
  const t = ids.token(); sessions.set(t, Date.now() + SESSION_MS);
  res.set('Set-Cookie', `admin=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${req.secure ? '; Secure' : ''}`).json({ ok: true });
});
app.post('/api/admin/logout', (req, res) => { sessions.delete(cookieToken(req)); res.set('Set-Cookie', 'admin=; Path=/; Max-Age=0').json({ ok: true }); });
app.get('/api/admin/me', (req, res) => { const t = cookieToken(req), exp = t && sessions.get(t); res.json({ loggedIn: !!exp && exp > Date.now() }); });
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const orders = [...store.db.orders].reverse().map((o) => ({ ...publicOrder(o), token: undefined, costCents: o.costCents }));
  const revenue = store.db.orders.reduce((a, o) => a + o.amountCents, 0), cost = store.db.orders.reduce((a, o) => a + (o.costCents || 0), 0);
  res.json({ orders, totals: { count: orders.length, revenueCents: revenue, profitCents: revenue - cost } });
});
app.get('/api/admin/plans', requireAdmin, (req, res) => res.json(store.db.plans));

const cents = (x) => { const c = v.toCents(x); return c && c <= MAX_PRICE_CENTS ? c : null; };
function planFromBody(b, existing = {}) {
  const p = { ...existing };
  const name = clean(b.name ?? existing.name, 60); if (!name) return ['Plan name is required.'];
  const network = clean(b.network ?? existing.network, 60); if (!network) return ['Network is required (e.g. "T-Mobile network").'];
  const costCents = b.cost !== undefined ? cents(b.cost) : existing.costCents; if (!costCents) return ['Enter your wholesale cost, like 12.00.'];
  let priceCents;
  if (b.markupPct !== undefined && b.markupPct !== '' && (b.price === undefined || b.price === '')) {
    const m = Number(b.markupPct); if (!(m >= 0 && m <= 500)) return ['Markup must be between 0 and 500%.'];
    priceCents = Math.round(costCents * (1 + m / 100) / 1) ;
  } else priceCents = b.price !== undefined ? cents(b.price) : existing.priceCents;
  if (!priceCents || priceCents > MAX_PRICE_CENTS) return ['Enter your selling price, like 15.00.'];
  const num = (x, d, max) => { if (x === undefined || x === '') return d; const n = Number(x); return n >= 0 && n <= max ? n : NaN; };
  const dataGB = num(b.dataGB, existing.dataGB ?? 0, 1000), hotspotGB = num(b.hotspotGB, existing.hotspotGB ?? 0, 1000), validityDays = num(b.validityDays, existing.validityDays ?? 30, 365);
  if ([dataGB, hotspotGB].some(Number.isNaN)) return ['Data and hotspot must be numbers of GB (0–1000).'];
  if (!Number.isInteger(validityDays) || validityDays < 1) return ['Validity must be a whole number of days (1–365).'];
  Object.assign(p, { name, network, costCents, priceCents, dataGB, hotspotGB, validityDays,
    unlimited: b.unlimited !== undefined ? !!b.unlimited : !!existing.unlimited, fiveG: b.fiveG !== undefined ? !!b.fiveG : !!existing.fiveG,
    active: b.active !== undefined ? !!b.active : existing.active ?? true,
    example: b.example !== undefined ? !!b.example : existing.example ?? false,
    talk: clean(b.talk ?? existing.talk ?? 'Unlimited', 40) || 'Unlimited', text: clean(b.text ?? existing.text ?? 'Unlimited', 40) || 'Unlimited',
    supplierSku: clean(b.supplierSku ?? existing.supplierSku ?? '', 60), notes: clean(b.notes ?? existing.notes ?? '', 300) });
  return [null, p];
}
app.post('/api/admin/plans', requireAdmin, (req, res) => {
  const [err, p] = planFromBody(req.body || {}); if (err) return bad(res, err);
  let id = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'plan';
  if (store.db.plans.some((x) => x.id === id)) id += '-' + ids.code(4).toLowerCase();
  p.id = id; store.db.plans.push(p); store.save(); res.status(201).json(p);
});
app.put('/api/admin/plans/:id', requireAdmin, (req, res) => {
  const i = store.db.plans.findIndex((x) => x.id === req.params.id); if (i < 0) return bad(res, 'Plan not found', 404);
  const [err, p] = planFromBody(req.body || {}, store.db.plans[i]); if (err) return bad(res, err);
  store.db.plans[i] = p; store.save(); res.json(p);
});
app.delete('/api/admin/plans/:id', requireAdmin, (req, res) => {
  const i = store.db.plans.findIndex((x) => x.id === req.params.id); if (i < 0) return bad(res, 'Plan not found', 404);
  store.db.plans.splice(i, 1); store.save(); res.json({ ok: true });
});

app.use('/api', (req, res) => bad(res, 'Not found', 404));
app.use((err, req, res, next) => { console.error('error', err.type || err.message); bad(res, err.type === 'entity.parse.failed' ? 'Bad request' : 'Something went wrong', err.status || 500); });

if (require.main === module) {
  const PORT = +(process.env.PORT || 3100);
  app.listen(PORT, '0.0.0.0', () => console.log(`${config.STORE_NAME} eSIM store on http://0.0.0.0:${PORT} (${TEST_MODE ? 'TEST MODE' : 'LIVE'})`));
}
module.exports = app;
