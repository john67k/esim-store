// MOCK eSIM supplier — TEST MODE. Issues a SAMPLE eSIM profile that will never activate:
// the SM-DP+ address uses the reserved ".invalid" domain and the activation code says SAMPLE.
const { code } = require('../../lib/ids');

module.exports = {
  name: 'mock',
  testMode: true,

  // Ask the supplier for an eSIM for this plan. Real suppliers return an SM-DP+ address + matching ID.
  async orderEsim({ plan, orderNumber }) {
    const smdp = 'sample-smdp.esim.invalid';
    const activationCode = `SAMPLE-${code(4)}-${code(4)}-${code(4)}-NOT-VALID`;
    return {
      supplierRef: 'mock_' + orderNumber,
      smdpAddress: smdp,
      activationCode,
      lpa: `LPA:1$${smdp}$${activationCode}`, // what the QR code contains (GSMA SGP.22 format)
      iccid: '8900000000' + Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('') + '0',
      phoneNumber: null, // a real supplier assigns this (or keeps the ported number)
      sample: true,
      plan: plan.supplierSku,
    };
  },

  // Port-in ("keep my number"). The transfer PIN is passed through and NEVER stored or logged.
  async submitPortIn({ orderNumber, port }) {
    if (!port || !port.pin) throw new Error('missing PIN');
    // A real supplier would return a port request ID and status updates over time.
    return { portRef: 'mockport_' + orderNumber, status: 'submitted (test)' };
  },
};
