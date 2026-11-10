// Stripe Checkout (real payments). Turns on automatically when STRIPE_SECRET_KEY is set.
// Flow: create a Checkout Session for the plan -> customer pays on Stripe's page ->
// Stripe calls POST /api/stripe/webhook (signature checked with STRIPE_WEBHOOK_SECRET) -> order marked paid.
// Card numbers never touch this server.
const Stripe = require('stripe');

let client = null;
const getClient = () => (client ||= new Stripe(process.env.STRIPE_SECRET_KEY));

module.exports = {
  name: 'stripe', testMode: false, mode: 'redirect', METHODS: ['stripe_checkout'], RATES: {},
  // Tests swap in a fake client so no network calls are made.
  setClient(c) { client = c; },

  async createCheckout({ order, plan, baseUrl }) {
    const n = encodeURIComponent(order.orderNumber), t = encodeURIComponent(order.token);
    const session = await getClient().checkout.sessions.create({
      mode: 'payment',
      customer_email: order.email,
      client_reference_id: order.orderNumber,
      metadata: { orderNumber: order.orderNumber, planId: plan.id },
      payment_intent_data: { metadata: { orderNumber: order.orderNumber } },
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: plan.priceCents,
        product_data: { name: `Airvoice Wireless plan: ${plan.name}`, description: `Sold by ${order.storeName}, an independent seller (not Airvoice Wireless). Activation is completed after we confirm your order.` } } }],
      success_url: `${baseUrl}/order?n=${n}&t=${t}&paid=1`,
      cancel_url: `${baseUrl}/checkout?plan=${encodeURIComponent(plan.id)}&canceled=1`,
    });
    return { sessionId: session.id, url: session.url };
  },

  // Throws if the signature is missing or wrong. rawBody must be the exact bytes Stripe sent.
  verifyWebhook(rawBody, signature) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    return Stripe.webhooks.constructEvent(rawBody, signature, secret);
  },
};
