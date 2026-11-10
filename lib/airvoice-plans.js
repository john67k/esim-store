// Airvoice Wireless prepaid plans recorded November 9, 2026.
// Sources (do not invent prices; every total below was read from the official page):
//   Catalog list of 28 plans: https://airvoicewireless.com/plans
//   Monthly price: <meta name="description"> on each plan page
//     https://airvoicewireless.com/plans/<slug>
//   Prepaid total due (monthly rate × term, rounded to the nearest dollar) appeared
//     as a dollar amount on that same plan page and is what the customer pays today.
//   Plan inclusions (unlimited talk & text, 5G+, taxes & fees included, AT&T network):
//     https://airvoicewireless.com/plans
//     https://airvoicewireless.com/broadband-facts
//   Unlimited high-speed policy (40GB high-speed, then slowed):
//     https://airvoicewireless.com/broadband-facts
// Recorded: November 9, 2026.
//
// Omitted (no verified customer price on a public plan page, or not a standard
// single-line sellable SKU we could price with certainty):
//   - Talk-and-text / "No Data" plan (FCC label lists $8.00/line on
//     https://airvoicewireless.com/broadband-facts, but there is no plan URL).
//   - 25GB + 10GB hotspot ($55/line) and Unlimited + 15GB hotspot ($65/line)
//     on broadband-facts only; not in the 28-plan catalog.
//   - $15/mo limited bundle at https://airvoicewireless.com/unlimited-15
//     (3/6/12 months prepaid at $45/$90/$180). After the term it renews at the
//     regular price, and it is a limited Airvoice-direct offer a reseller may
//     not be able to honor.
//   - 30-day 10GB free trial (https://airvoicewireless.com/trial). The trial
//     page says service then continues at $27/mo; the official 10GB 1 Month
//     plan page lists $30.00/mo. We use $30.00 from the plan page and do not
//     sell the free trial.
//   - Student 40% off (https://airvoicewireless.com/plans/student-plan) needs
//     .edu verification on Airvoice's own site.
//   - Family / multi-line discounts (listed on the plans page and broadband-facts).

const SOURCE_DATE = '2026-11-09';
const CATALOG_VERSION = 'airvoice-2026-11-09';

// [id/slug, dataGB or 'unl', months, monthlyCents, totalCents]
const ROWS = [
  ['1-gb-1-month', 1, 1, 1200, 1200],
  ['1-gb-3-months', 1, 3, 1000, 3000],
  ['1-gb-6-months', 1, 6, 833, 5000],
  ['1-gb-12-months', 1, 12, 800, 9600],
  ['3-gb-1-month', 3, 1, 1800, 1800],
  ['3-gb-3-months', 3, 3, 1600, 4800],
  ['3-gb-6-months', 3, 6, 1600, 9600],
  ['3-gb-12-months', 3, 12, 1442, 17300],
  ['6gb-1-month', 6, 1, 2400, 2400],
  ['6gb-3-months', 6, 3, 2167, 6500],
  ['6gb-6-months', 6, 6, 1867, 11200],
  ['6gb-12-months', 6, 12, 1717, 20600],
  ['10gb-1-month', 10, 1, 3000, 3000],
  ['10gb-3-months', 10, 3, 2867, 8600],
  ['10gb-6-months', 10, 6, 2500, 15000],
  ['10gb-12-months', 10, 12, 2300, 27600],
  ['16-gb-1-month', 16, 1, 4200, 4200],
  ['16-gb-3-months', 16, 3, 4000, 12000],
  ['16-gb-6-months', 16, 6, 3700, 22200],
  ['16-gb-12-months', 16, 12, 3450, 41400],
  ['25-gb-1-month', 25, 1, 4800, 4800],
  ['25-gb-3-months', 25, 3, 4567, 13700],
  ['25-gb-6-months', 25, 6, 4317, 25900],
  ['25-gb-12-months', 25, 12, 3992, 47900],
  ['unlimited-1-month', 'unl', 1, 5400, 5400],
  ['unlimited-3-months', 'unl', 3, 5200, 15600],
  ['unlimited-6-months', 'unl', 6, 5000, 30000],
  ['unlimited-12-months', 'unl', 12, 4600, 55200],
];

const DAYS = { 1: 30, 3: 90, 6: 180, 12: 365 };
const money = (c) => '$' + (c / 100).toFixed(2);

function notes(dataGB, months, monthlyCents, totalCents, unlimited) {
  const term = months === 1
    ? `${money(totalCents)} for 30 days`
    : `${money(totalCents)} due today (${money(monthlyCents)}/mo for ${months} months)`;
  const unl = unlimited ? ' 40GB high-speed, then may slow.' : '';
  return `Unlimited nationwide talk & text. 5G+ where available. Taxes & fees included. Prepaid ${term}.${unl} Runs on AT&T's network. After this term, renews at the then-current rate unless canceled.`;
}

const CATALOG = ROWS.map(([id, data, months, monthlyCents, totalCents]) => {
  const unlimited = data === 'unl';
  const dataGB = unlimited ? 40 : data;
  const dataLabel = unlimited ? 'Unlimited' : `${data}GB`;
  const termLabel = months === 1 ? '1 Month' : `${months} Months`;
  return {
    id,
    name: `${dataLabel} ${termLabel}`,
    network: 'Airvoice Wireless',
    example: false,
    active: true,
    fiveG: true,
    unlimited,
    dataGB,
    talk: 'Unlimited',
    text: 'Unlimited',
    hotspotGB: 0,
    validityDays: DAYS[months],
    termMonths: months,
    monthlyPriceCents: monthlyCents,
    priceCents: totalCents,
    // Wholesale cost is unknown until a dealer agreement is in place; default to the retail total so profit shows as $0 until you enter your cost in admin.
    costCents: totalCents,
    supplierSku: 'AIRVOICE-' + id.toUpperCase(),
    sourceUrl: `https://airvoicewireless.com/plans/${id}`,
    sourceDate: SOURCE_DATE,
    notes: notes(dataGB, months, monthlyCents, totalCents, unlimited),
  };
});

const OLD_SAMPLE_IDS = new Set([
  'starter-5', 'value-15', 'boost-unl', 'air-basic', 'air-8', 'air-unl',
  'tmo-10', 'tmo-unl', 'att-3', 'vz-unl', 'week-pass',
]);

module.exports = { CATALOG, CATALOG_VERSION, SOURCE_DATE, OLD_SAMPLE_IDS };
