// Tiny JSON-file datastore with atomic writes. Creates its data folder on boot.
const fs = require('fs');
const path = require('path');
const { CATALOG, CATALOG_VERSION, OLD_SAMPLE_IDS } = require('./airvoice-plans');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

const copy = (x) => JSON.parse(JSON.stringify(x));
const fresh = () => ({ catalogVersion: CATALOG_VERSION, plans: copy(CATALOG), orders: [] });
function load() {
  try { const d = JSON.parse(fs.readFileSync(FILE, 'utf8')); d.plans ||= []; d.orders ||= []; return d; }
  catch { return null; }
}
let db = load();
if (!db) { db = fresh(); save(); }
else if (db.catalogVersion !== CATALOG_VERSION) {
  // Upgrade: drop the old example plans, add the real Airvoice catalog. Plans the owner added by hand are kept.
  db.plans = db.plans.filter((p) => !p.example && !OLD_SAMPLE_IDS.has(p.id) && !CATALOG.some((c) => c.id === p.id));
  db.plans.unshift(...copy(CATALOG)); db.catalogVersion = CATALOG_VERSION; save();
}

function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}

module.exports = { DATA_DIR, FILE, get db() { return db; }, save, reset() { db = fresh(); save(); } };
