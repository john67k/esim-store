// EXAMPLE catalog for test mode. Names, prices and specs are made up for demo purposes;
// they are NOT real carrier plans or real carrier pricing. Replace them in the admin page
// (or load them from your supplier) before going live.
// costCents = what the wholesaler would charge you (example). priceCents = what your customer pays.
const p = (id, name, network, o) => ({ id, name, network, example: true, active: true,
  fiveG: false, unlimited: false, dataGB: 0, talk: 'Unlimited', text: 'Unlimited', hotspotGB: 0, validityDays: 30,
  supplierSku: 'MOCK-' + id.toUpperCase(), ...o });

const SAMPLE_PLANS = [
  p('starter-5', 'Starter 5GB', 'Boost Mobile', { dataGB: 5, fiveG: true, hotspotGB: 5, costCents: 1200, priceCents: 1500 }),
  p('value-15', 'Value 15GB', 'Boost Mobile', { dataGB: 15, fiveG: true, hotspotGB: 15, costCents: 2000, priceCents: 2500 }),
  p('boost-unl', 'Unlimited Plus', 'Boost Mobile', { unlimited: true, dataGB: 30, fiveG: true, hotspotGB: 10, costCents: 3600, priceCents: 4500 }),
  p('air-basic', 'Basic Talk & Text 1GB', 'Airvoice Wireless', { dataGB: 1, hotspotGB: 0, costCents: 800, priceCents: 1000 }),
  p('air-8', 'Everyday 8GB', 'Airvoice Wireless', { dataGB: 8, fiveG: true, hotspotGB: 8, costCents: 1900, priceCents: 2400 }),
  p('air-unl', 'Unlimited Everyday', 'Airvoice Wireless', { unlimited: true, dataGB: 20, fiveG: true, hotspotGB: 5, costCents: 3200, priceCents: 4000 }),
  p('tmo-10', 'Flex 10GB', 'T-Mobile network', { dataGB: 10, fiveG: true, hotspotGB: 10, costCents: 1600, priceCents: 2000 }),
  p('tmo-unl', 'Unlimited 5G', 'T-Mobile network', { unlimited: true, dataGB: 50, fiveG: true, hotspotGB: 15, costCents: 4000, priceCents: 5000 }),
  p('att-3', 'Light 3GB', 'AT&T network', { dataGB: 3, hotspotGB: 3, costCents: 1000, priceCents: 1300 }),
  p('vz-unl', 'Unlimited Max', 'Verizon network', { unlimited: true, dataGB: 35, fiveG: true, hotspotGB: 15, costCents: 4400, priceCents: 5500 }),
  p('week-pass', '7-Day Traveler 3GB', 'T-Mobile network', { dataGB: 3, fiveG: true, hotspotGB: 3, validityDays: 7, costCents: 700, priceCents: 900 }),
];
module.exports = { SAMPLE_PLANS };
