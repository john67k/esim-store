// One place to rename the store. Change STORE_NAME here (or set the STORE_NAME env var on Render).
const STORE_NAME = process.env.STORE_NAME || 'SimNow';
module.exports = {
  STORE_NAME,
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@example.com',
  // Kept for the future wholesaler/API integration. Activations are done by hand in /admin for now.
  SUPPLIER: process.env.SUPPLIER || 'mock',
  // "mock" = TEST MODE. Setting STRIPE_SECRET_KEY switches to real Stripe payments automatically.
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'mock',
  DISCLAIMER: `${STORE_NAME} is an independent seller, not Airvoice Wireless, and is not affiliated with or endorsed by Airvoice Wireless or any carrier. Airvoice Wireless and other trademarks belong to their owners.`,
  ACTIVATION_NOTE: 'Activation is completed after we confirm your order. Your eSIM details appear on your order page once your line is activated.',
};
