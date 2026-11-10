// One place to rename the store. Change STORE_NAME here (or set the STORE_NAME env var on Render).
module.exports = {
  STORE_NAME: process.env.STORE_NAME || 'SimNow',
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@example.com',
  // Which supplier + payment provider to use. "mock" = TEST MODE (nothing real is sold or charged).
  SUPPLIER: process.env.SUPPLIER || 'mock',
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'mock',
  DISCLAIMER: 'Independent retailer, not affiliated with or endorsed by the carriers listed. Trademarks belong to their owners.',
};
