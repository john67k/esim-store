// MOCK payments — TEST MODE. Simulates every method; no money moves.
// Test cards: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined.
const v = require('../../lib/validation');
const crypto = require('crypto');

const RATES = { BTC: 60000, USDC: 1, USDT: 1 }; // fixed example rates for test mode
const METHODS = ['card', 'apple_pay', 'google_pay', 'cashapp', 'paypal', 'crypto'];

function validate(method, d = {}) {
  if (!METHODS.includes(method)) return 'Choose a payment method.';
  if (method === 'card') {
    if (!String(d.name || '').trim()) return 'Enter the name on the card.';
    if (!v.luhn(d.number)) return 'That card number is not valid.';
    const brand = v.cardBrand(d.number);
    if (!v.validExpiry(d.expMonth, d.expYear)) return 'The expiry date is invalid or in the past.';
    if (!v.validCvc(d.cvc, brand)) return brand === 'amex' ? 'CVC must be 4 digits for Amex.' : 'CVC must be 3 digits.';
    if (!/^\d{5}$/.test(String(d.zip || '').trim())) return 'Enter a 5-digit billing ZIP.';
  }
  if (method === 'cashapp' && !v.validCashtag(d.cashtag)) return 'Enter your $Cashtag, like $janedoe.';
  if (method === 'paypal' && !v.validEmail(d.email)) return 'Enter your PayPal email.';
  if (method === 'crypto' && !RATES[d.asset]) return 'Choose BTC, USDC or USDT.';
  return null;
}

module.exports = {
  name: 'mock', testMode: true, METHODS, RATES,
  async charge({ amountCents, method, details = {} }) {
    const err = validate(method, details);
    if (err) return { ok: false, userError: err };
    const ref = 'test_' + crypto.randomBytes(6).toString('hex');
    let summary = { method };
    if (method === 'card') {
      const n = v.digits(details.number);
      summary = { method, brand: v.cardBrand(n), last4: n.slice(-4) };
      if (n === '4000000000000002') return { ok: false, declined: true, userError: 'Your card was declined (test decline card).', summary };
    }
    if (method === 'cashapp') summary.cashtag = details.cashtag.trim();
    if (method === 'paypal') summary.email = details.email.trim();
    if (method === 'crypto') summary = { method, asset: details.asset, amount: (amountCents / 100 / RATES[details.asset]).toFixed(details.asset === 'BTC' ? 8 : 2) };
    return { ok: true, ref, summary };
  },
};
