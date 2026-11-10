// Browser end-to-end test at phone width (390px) in headless Chrome.
// SHOTS=1 also saves screenshots to ./screenshots. BASE_URL=... tests a running server instead of a temporary one.
const os = require('os'); const fs = require('fs'); const path = require('path'); const assert = require('assert');
const { chromium } = require('playwright-core');
const OUT = path.join(__dirname, '..', 'screenshots');
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ✓', m); };

(async () => {
  let base = process.env.BASE_URL, srv, pw = process.env.ADMIN_PASSWORD;
  if (!base) {
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'esim-ui-')); process.env.ADMIN_PASSWORD = pw = 'ui-admin-pw';
    const app = require('../server'); srv = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
    base = `http://127.0.0.1:${srv.address().port}`;
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const shot = async (name) => { if (process.env.SHOTS) { await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, name), fullPage: true }); console.log('    saved screenshots/' + name); } };
  const noHScroll = async (label) => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${label}: no sideways scrolling at 390px`);

  // Home + filters
  await page.goto(base + '/'); await page.waitForSelector('.plan');
  ok(await page.isVisible('#testbar'), 'test-mode banner visible');
  ok(/independent seller/i.test(await page.textContent('#disclaimer')) && /not Airvoice/i.test(await page.textContent('#disclaimer')), 'footer says SimNow is an independent seller, not Airvoice');
  ok((await page.textContent('.brand')).includes('SimNow'), 'store brand shown');
  ok((await page.textContent('h1')).includes('Airvoice Wireless plans'), 'plans presented as Airvoice Wireless plans');
  const all = await page.$$eval('.plan', (e) => e.length);
  ok(all === 28 && (await page.$$eval('.plan .net', (e) => e.every((x) => x.textContent.includes('Airvoice Wireless plan')))), 'all 28 catalog plans are labeled Airvoice Wireless plans');
  await page.selectOption('#fNet', 'Airvoice Wireless'); const air = await page.$$eval('.plan .net', (e) => e.map((x) => x.textContent));
  ok(air.length === all && air.every((t) => t.includes('Airvoice')), 'filter by network');
  await page.selectOption('#fNet', ''); await page.check('#fUnl'); ok(await page.$$eval('.plan', (e) => e.every((x) => x.textContent.includes('Unlimited'))), 'unlimited filter');
  await page.uncheck('#fUnl'); await page.selectOption('#fPrice', '1500'); ok(await page.$$eval('.plan .price', (e) => e.every((x) => parseFloat(x.textContent.slice(1)) <= 15)), 'price filter');
  await page.selectOption('#fPrice', ''); await page.selectOption('#fData', '15-9999'); ok((await page.$$eval('.plan', (e) => e.length)) >= 1, 'data filter');
  await page.selectOption('#fData', ''); await page.check('#f5g'); ok(await page.$$eval('.plan', (e) => e.every((x) => x.textContent.includes('5G'))), '5G filter');
  await page.uncheck('#f5g'); ok(await page.isHidden('#exampleNote') && (await page.$$eval('.tag.y', (e) => e.length)) === 0, 'real plans are not labeled as example data');
  await noHScroll('home'); await page.evaluate(() => scrollTo(0, 0)); await shot('01-home.png');

  // Plan detail
  await page.click('[data-plan=unlimited-1-month] a.btn.light'); await page.waitForSelector('#details');
  const det = await page.textContent('#plan');
  ok(['Data', 'Talk', 'Text', 'Valid for', 'Network', 'Airvoice Wireless', '$54.00', 'after we confirm your order'].every((s) => det.includes(s)) && !det.includes('Example plan'), 'plan detail shows real Airvoice unlimited plan at $54.00');
  await noHScroll('plan detail'); await shot('02-plan-detail.png');

  // Compatibility page
  await page.goto(base + '/compatibility'); await page.selectOption('#cBrand', 'Apple'); await page.selectOption('#cModel', { label: 'iPhone X' });
  ok(await page.isVisible('[data-esim=no]'), 'iPhone X flagged as no eSIM');
  await page.selectOption('#cBrand', 'Samsung'); await page.selectOption('#cModel', { label: 'Galaxy S24' });
  ok(await page.isVisible('[data-esim=yes]') && (await page.textContent('#cResult')).includes('carrier-unlocked'), 'Galaxy S24 supported + unlocked note');
  await page.selectOption('#cBrand', 'Apple'); await page.selectOption('#cModel', { label: 'iPhone 15' });
  await noHScroll('compatibility'); await shot('03-compatibility.png');

  // Checkout: bad card first, then good card + port-in
  await page.goto(base + '/checkout?plan=10gb-1-month'); await page.waitForSelector('#planSel option', { state: 'attached' }); await page.waitForFunction(() => document.querySelector('#payBtn').textContent.includes('$'));
  ok((await page.inputValue('#planSel')) === '10gb-1-month' && (await page.textContent('#payBtn')).includes('$30.00'), 'checkout preselects plan');
  ok(/independent seller/i.test(await page.textContent('#checkoutNote')) && /not Airvoice/i.test(await page.textContent('#checkoutNote')) && /confirm your order/i.test(await page.textContent('#checkoutNote')), 'checkout notes independent seller and post-purchase activation');
  await page.fill('#email', 'maria@example.com');
  await page.selectOption('#cBrand', 'Apple'); await page.selectOption('#cModel', { label: 'iPhone 15' });
  await page.check('#unlocked'); await page.check('#portOn');
  await page.fill('#portPhone', '(312) 555-0188'); await page.fill('#portCarrier', 'Verizon'); await page.fill('#portAccount', '445566778'); await page.fill('#portPin', '246813'); await page.fill('#portZip', '60601');
  await page.fill('#ccName', 'Maria Lopez'); await page.type('#ccNum', '4242424242424241'); await page.type('#ccExp', '1230'); await page.fill('#ccCvc', '123'); await page.fill('#ccZip', '60601');
  await page.click('#payBtn'); ok(await page.isVisible('#ccNumErr'), 'Luhn check in browser');
  await page.fill('#ccNum', ''); await page.type('#ccNum', '4242424242424242');
  ok((await page.inputValue('#ccNum')) === '4242 4242 4242 4242', 'card number formatted');
  await noHScroll('checkout'); await page.evaluate(() => scrollTo(0, 0)); await shot('04-checkout.png');
  await page.click('#payBtn'); await page.waitForURL(/\/order\?/); await page.waitForSelector('#awaitingNote');

  // Confirmation — paid, waiting for the owner to activate (no SAMPLE QR)
  const conf = await page.textContent('#order');
  ok(await page.isVisible('#awaitingNote') && (await page.textContent('#statusBadge')).includes('Paid – awaiting activation'), 'confirmation shows Paid – awaiting activation');
  ok(!(await page.$('#qr')) && !(await page.$('#sampleWarn')) && !/SAMPLE/i.test(conf), 'no SAMPLE QR code on a real paid order');
  ok(conf.includes('Received (hidden for your security)') && !conf.includes('246813') && !(await page.content()).includes('246813'), 'PIN not shown after submit');
  const orderNum = await page.textContent('#orderNum');
  const orderUrl = page.url();
  await noHScroll('confirmation'); await shot('05-awaiting-activation.png');

  // Apple Pay simulated sheet
  await page.goto(base + '/checkout?plan=starter-5'); await page.fill('#email', 'sam@example.com'); await page.check('#unlocked'); await page.click('[data-m=apple_pay]');
  await page.click('#payBtn'); await page.waitForSelector('#sheet.show'); ok((await page.textContent('#sheet')).includes('Test mode'), 'Apple Pay simulated sheet');
  await page.click('#sheetOk'); await page.waitForURL(/\/order\?/);

  // My orders lookup
  await page.goto(base + '/orders'); await page.fill('#lEmail', 'maria@example.com'); await page.fill('#lNum', orderNum); await page.click('#lookup button');
  await page.waitForSelector('#awaitingNote'); ok((await page.textContent('#orderNum')) === orderNum, 'My orders lookup works');

  // Admin
  await page.goto(base + '/admin'); await page.waitForSelector('#login:not([hidden])'); await page.fill('#pw', pw); await page.click('#login button');
  await page.waitForSelector('.adm-order'); ok((await page.$$eval('.adm-order', (e) => e.length)) >= 2 && (await page.textContent('#orderList')).includes(orderNum), 'admin lists orders');
  ok(!(await page.content()).includes('246813'), 'admin never shows PIN');
  const row = page.locator('.adm-order', { hasText: orderNum });
  await row.locator('[name=iccid]').fill('8901410123456789012');
  await row.locator('[name=smdpAddress]').fill('smdp.example.com');
  await row.locator('[name=activationCode]').fill('ABCDE-FGHI-JKLM');
  await row.locator('[name=phoneNumber]').fill('4155550100');
  await row.locator('button[type=submit]').click();
  await page.waitForFunction((n) => { const el = [...document.querySelectorAll('.adm-order')].find((e) => e.textContent.includes(n)); return el && el.textContent.includes('Activated'); }, orderNum);
  await noHScroll('admin'); await shot('06-admin-orders.png');
  await page.goto(orderUrl); await page.waitForSelector('#qr');
  await page.waitForFunction(() => document.querySelector('#qr').complete && document.querySelector('#qr').naturalWidth > 0);
  ok((await page.textContent('#statusBadge')).includes('Activated') && (await page.textContent('#smdp')) === 'smdp.example.com' && (await page.textContent('#lpa')) === 'LPA:1$smdp.example.com$ABCDE-FGHI-JKLM', 'customer sees real activation details after admin activates');
  ok(!(await page.content()).includes('SAMPLE'), 'activated order has no SAMPLE watermark');
  await page.click('[data-tab=android]'); ok(await page.isVisible('[data-tabpane=android]'), 'Android install steps'); await page.click('[data-tab=ios]');
  await page.goto(base + '/admin');
  await page.click('[data-tab=plans]'); await page.click('#addPlan');
  await page.fill('#pName', 'Weekend 2GB'); await page.fill('#pNet', 'AT&T network'); await page.fill('#pCost', '4.00'); await page.fill('#pMarkup', '50');
  ok((await page.inputValue('#pPrice')) === '6.00', 'markup % fills price'); await page.fill('#pData', '2'); await page.fill('#pDays', '3');
  await shot('07-admin-add-plan.png');
  await page.click('#pSave'); await page.waitForSelector('#planForm', { state: 'hidden' });
  ok((await page.textContent('#planList')).includes('Weekend 2GB'), 'admin adds plan');
  await page.goto(base + '/'); await page.waitForSelector('.plan'); ok((await page.textContent('#plans')).includes('Weekend 2GB'), 'new plan shows in store');
  await page.goto(base + '/admin'); await page.click('[data-tab=plans]'); await page.waitForSelector('[data-edit]');
  await page.click('.plan-row:has-text("Weekend 2GB") [data-edit]'); page.once('dialog', (d) => d.accept()); await page.click('#pDelete');
  await page.waitForFunction(() => !document.querySelector('#planList').textContent.includes('Weekend 2GB')); ok(true, 'admin removes plan');
  await page.click('[data-tab=plans]'); await shot('08-admin-plans.png');

  ok(errors.length === 0, 'no browser errors' + (errors.length ? ': ' + errors.join('; ') : ''));
  console.log(`\n${pass} browser checks passed`);
  await browser.close(); if (srv) { srv.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
