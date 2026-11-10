const { SUPPLIER } = require('../../config');
const impl = { mock: () => require('./mock'), wholesaler: () => require('./wholesaler') }[SUPPLIER];
if (!impl) throw new Error(`Unknown SUPPLIER "${SUPPLIER}" (use mock or wholesaler)`);
module.exports = impl();
