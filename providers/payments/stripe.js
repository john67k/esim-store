// STUB for going live with Stripe (cards, Apple Pay, Google Pay, Cash App Pay, and more via Payment Element).
// TODO when going live:
//  1. npm i stripe, set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY on Render, set PAYMENT_PROVIDER=stripe.
//  2. Replace the card form on checkout.html with Stripe's Payment Element so card numbers never touch this server.
//  3. Create a PaymentIntent here, confirm it in the browser, and only order the eSIM after the
//     `payment_intent.succeeded` webhook arrives (add POST /webhooks/stripe and verify the signature).
//  4. PayPal and crypto need their own providers (PayPal Checkout; Coinbase Commerce / BitPay / Strike).
module.exports = {
  name: 'stripe', testMode: false, METHODS: ['card', 'apple_pay', 'google_pay', 'cashapp'], RATES: {},
  async charge() {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).');
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const pi = await stripe.paymentIntents.create({ amount: amountCents, currency: 'usd', automatic_payment_methods: { enabled: true } });
    throw new Error('TODO: finish providers/payments/stripe.js');
  },
};
