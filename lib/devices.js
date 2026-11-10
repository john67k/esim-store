// eSIM compatibility list (US models). "yes" = supports eSIM, "no" = no eSIM, "limited" = see note.
// Not exhaustive. Customers should also check Settings on their phone; the phone must be carrier-unlocked.
const list = [];
const add = (brand, models, esim, note) => models.forEach((m) => list.push({ id: (brand + '-' + m).toLowerCase().replace(/[^a-z0-9]+/g, '-'), brand, model: m, esim, note: note || '' }));

add('Apple', ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 17', 'iPhone 16e', 'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
  'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14'], 'yes', 'US models are eSIM-only.');
add('Apple', ['iPhone SE (3rd gen)', 'iPhone SE (2nd gen)', 'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini', 'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
  'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11', 'iPhone XS Max', 'iPhone XS', 'iPhone XR'], 'yes');
add('Apple', ['iPhone X', 'iPhone 8 / 8 Plus', 'iPhone 7 or older', 'iPhone SE (1st gen)'], 'no');
add('Google', ['Pixel 10 Pro XL', 'Pixel 10 Pro', 'Pixel 10', 'Pixel 9a', 'Pixel 9 Pro Fold', 'Pixel 9 Pro XL', 'Pixel 9 Pro', 'Pixel 9', 'Pixel 8a', 'Pixel 8 Pro', 'Pixel 8',
  'Pixel 7a', 'Pixel 7 Pro', 'Pixel 7', 'Pixel Fold', 'Pixel 6a', 'Pixel 6 Pro', 'Pixel 6', 'Pixel 5a', 'Pixel 5', 'Pixel 4a', 'Pixel 4 / 4 XL'], 'yes');
add('Google', ['Pixel 3 / 3a'], 'limited', 'Phones bought from some carriers do not support eSIM. Check Settings > Network & internet > SIMs.');
add('Google', ['Pixel 2 or older'], 'no');
add('Samsung', ['Galaxy S25 Ultra', 'Galaxy S25+', 'Galaxy S25', 'Galaxy S25 Edge', 'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S24 FE', 'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23', 'Galaxy S23 FE',
  'Galaxy S22 Ultra', 'Galaxy S22+', 'Galaxy S22', 'Galaxy S21 Ultra', 'Galaxy S21+', 'Galaxy S21', 'Galaxy S20 series',
  'Galaxy Z Fold7', 'Galaxy Z Flip7', 'Galaxy Z Fold6', 'Galaxy Z Flip6', 'Galaxy Z Fold5', 'Galaxy Z Flip5', 'Galaxy Z Fold4', 'Galaxy Z Flip4', 'Galaxy Z Fold3', 'Galaxy Z Flip3'], 'yes');
add('Samsung', ['Galaxy A54 / A35 / A36 / A55'], 'limited', 'eSIM depends on the exact US model and carrier software. Check Settings > Connections > SIM manager for "Add eSIM".');
add('Samsung', ['Galaxy A15 / A16 / A25 or older A series', 'Galaxy S10 or older'], 'no');

module.exports = { DEVICES: list };
