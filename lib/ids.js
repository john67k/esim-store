const crypto = require('crypto');
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid typos
const code = (n) => Array.from(crypto.randomBytes(n), (b) => ALPHA[b % ALPHA.length]).join('');
module.exports = { orderNumber: () => 'SN-' + code(6), token: () => crypto.randomBytes(18).toString('base64url'), code };
