// Tiny JSON-file datastore with atomic writes. Creates its data folder on boot.
const fs = require('fs');
const path = require('path');
const { SAMPLE_PLANS } = require('./sample-plans');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

const fresh = () => ({ plans: JSON.parse(JSON.stringify(SAMPLE_PLANS)), orders: [] });
function load() {
  try { const d = JSON.parse(fs.readFileSync(FILE, 'utf8')); d.plans ||= []; d.orders ||= []; return d; }
  catch { return null; }
}
let db = load();
if (!db) { db = fresh(); save(); }

function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}

module.exports = { DATA_DIR, FILE, get db() { return db; }, save, reset() { db = fresh(); save(); } };
