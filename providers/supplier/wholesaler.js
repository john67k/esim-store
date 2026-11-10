// STUB for a real prepaid / eSIM wholesaler or distributor API.
// Fill in the TODOs with your supplier's docs once you have a dealer/reseller account.
// Every supplier is different, but they all need the same three things below.
const BASE = process.env.SUPPLIER_API_URL;     // TODO: e.g. https://api.your-wholesaler.com/v1
const KEY = process.env.SUPPLIER_API_KEY;      // TODO: set on Render as a secret env var

function notReady() {
  throw new Error('Real supplier is not connected yet. Set SUPPLIER_API_URL and SUPPLIER_API_KEY and finish providers/supplier/wholesaler.js.');
}

module.exports = {
  name: 'wholesaler',
  testMode: false,

  // TODO: optional — pull the supplier's plan list + wholesale cost into the catalog (admin can then set prices).
  async listPlans() { if (!BASE || !KEY) notReady(); /* GET `${BASE}/plans` */ return []; },

  // TODO: activate / purchase an eSIM for plan.supplierSku. Must return:
  // { supplierRef, smdpAddress, activationCode, lpa: `LPA:1$${smdpAddress}$${activationCode}`, iccid, phoneNumber }
  async orderEsim({ plan, orderNumber, email }) {
    if (!BASE || !KEY) notReady();
    // const r = await fetch(`${BASE}/activations`, { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ sku: plan.supplierSku, reference: orderNumber, email }) });
    // TODO: map the response fields to the shape above. Handle errors and retries (use orderNumber as an idempotency key).
    notReady();
  },

  // TODO: submit a number transfer. Send the PIN straight to the supplier over HTTPS. Do not save or log it.
  async submitPortIn({ orderNumber, port }) {
    if (!BASE || !KEY) notReady();
    notReady();
  },
};
