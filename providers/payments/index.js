const { PAYMENT_PROVIDER } = require('../../config');
const impl = { mock: () => require('./mock'), stripe: () => require('./stripe') }[PAYMENT_PROVIDER];
if (!impl) throw new Error(`Unknown PAYMENT_PROVIDER "${PAYMENT_PROVIDER}" (use mock or stripe)`);
module.exports = impl();
