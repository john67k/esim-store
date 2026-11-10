// Stripe is used when STRIPE_SECRET_KEY is set (or PAYMENT_PROVIDER=stripe). Otherwise mock = TEST MODE.
const { PAYMENT_PROVIDER } = require('../../config');
const name = process.env.STRIPE_SECRET_KEY ? 'stripe' : PAYMENT_PROVIDER;
const impl = { mock: () => require('./mock'), stripe: () => require('./stripe') }[name];
if (!impl) throw new Error(`Unknown PAYMENT_PROVIDER "${name}" (use mock or stripe)`);
module.exports = impl();
